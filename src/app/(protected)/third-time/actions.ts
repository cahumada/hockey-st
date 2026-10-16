"use server";

import { revalidatePath } from "next/cache";
import { thirdTimeCollaboratorKinds } from "@/lib/collaborators";
import { prisma } from "@/lib/db";
import { removePrivateReceipt, savePrivateReceipt } from "@/lib/expense-receipt-store";
import { receiptStorageUnavailableMessage, validateReceiptFile } from "@/lib/expenses";
import { audited } from "@/lib/require-access";
import {
  planCategoryFeeBatch,
  thirdTimeChargedMonth,
  validateThirdTimeFormValues,
  type CategoryFeeBatchErrors,
  type ParsedThirdTimeFee,
  type ThirdTimeFormErrors,
  type ThirdTimeFormValues,
} from "@/lib/third-time";

export type ThirdTimeActionState = {
  status: "idle" | "saved" | "error";
  message: string;
  errors?: ThirdTimeFormErrors & CategoryFeeBatchErrors & { receipt?: string };
};

const thirdTimePath = "/third-time";

export async function createThirdTimeFee(formData: FormData): Promise<ThirdTimeActionState> {
  return audited("register-movements", () => createThirdTimeFeeRecord(formData));
}

async function createThirdTimeFeeRecord(formData: FormData): Promise<ThirdTimeActionState> {
  const parsed = await parseThirdTimeForm(formData, null);
  if (!parsed.ok) return parsed.state;

  const created = await prisma.thirdTimeFee.create({
    data: feeData(parsed.value),
  });

  const stored = await storeReceipt(created.id, parsed.receipt, null);
  if (!stored.ok) {
    await prisma.thirdTimeFee.delete({ where: { id: created.id } });
    return stored.state;
  }
  if (stored.receipt) {
    await prisma.thirdTimeFee.update({
      where: { id: created.id },
      data: {
        receiptPath: stored.receipt.pathname,
        receiptContentType: stored.receipt.contentType,
      },
    });
  }

  revalidatePath(thirdTimePath);
  return { status: "saved", message: "Cuota registrada." };
}

export async function createCategoryThirdTimeFees(formData: FormData): Promise<ThirdTimeActionState> {
  return audited("register-movements", () => createCategoryThirdTimeFeesRecord(formData));
}

async function createCategoryThirdTimeFeesRecord(formData: FormData): Promise<ThirdTimeActionState> {
  const categoryCode = String(formData.get("categoryCode") ?? "").trim();
  const chargedOn = thirdTimeChargedMonth(String(formData.get("chargedOn") ?? ""));
  const [categories, players, collaborators, existingCount] = await Promise.all([
    prisma.category.findMany({ select: { code: true } }),
    prisma.player.findMany({
      orderBy: { displayName: "asc" },
      select: { id: true, categoryCode: true, rosterStatus: true },
    }),
    prisma.collaborator.findMany({
      where: { kind: { in: [...thirdTimeCollaboratorKinds] } },
      select: { id: true },
    }),
    chargedOn && categoryCode
      ? prisma.thirdTimeFee.count({
          where: { ...categoryMonthWhere(categoryCode, chargedOn), deletedAt: null },
        })
      : Promise.resolve(0),
  ]);
  const planned = planCategoryFeeBatch(
    {
      categoryCode,
      chargedOn: String(formData.get("chargedOn") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      status: String(formData.get("status") ?? "PENDING"),
      controllerId: String(formData.get("controllerId") ?? ""),
    },
    {
      categoryCodes: categories.map((category) => category.code),
      players: players.map((player) => ({
        id: player.id,
        categoryCode: player.categoryCode,
        active: player.rosterStatus === "ACTIVE",
      })),
      collaboratorIds: collaborators.map((collaborator) => collaborator.id),
      existingCount,
    },
  );
  if (!planned.ok) {
    return { status: "error", message: planned.message, errors: planned.errors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const again = await tx.thirdTimeFee.count({
        where: {
          ...categoryMonthWhere(planned.value.categoryCode, planned.value.chargedOn),
          deletedAt: null,
        },
      });
      if (again > 0) {
        throw new CategoryMonthTaken();
      }
      await tx.thirdTimeFee.createMany({
        data: planned.value.playerIds.map((playerId) => ({
          playerId,
          categoryCode: planned.value.categoryCode,
          chargedOn: utcDate(planned.value.chargedOn),
          amount: planned.value.amount,
          status: planned.value.status,
          controllerId: planned.value.controllerId,
        })),
      });
    });
  } catch (error) {
    if (error instanceof CategoryMonthTaken) {
      return {
        status: "error",
        message: "Ya hay cuotas cargadas para esa categoría en ese mes.",
        errors: { form: "Ya hay cuotas cargadas para esa categoría en ese mes." },
      };
    }
    throw error;
  }

  revalidatePath(thirdTimePath);
  const count = planned.value.playerIds.length;
  return {
    status: "saved",
    message: count === 1 ? "Se registró 1 cuota." : `Se registraron ${count} cuotas.`,
  };
}

class CategoryMonthTaken extends Error {}

function categoryMonthWhere(categoryCode: string, chargedOn: string) {
  const [year, month] = chargedOn.split("-").map(Number);
  return {
    categoryCode,
    chargedOn: {
      gte: utcDate(chargedOn),
      lt: new Date(Date.UTC(year, month, 1)),
    },
  };
}

export async function updateThirdTimeFee(formData: FormData): Promise<ThirdTimeActionState> {
  return audited("register-movements", () => updateThirdTimeFeeRecord(formData));
}

async function updateThirdTimeFeeRecord(formData: FormData): Promise<ThirdTimeActionState> {
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.thirdTimeFee.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, receiptPath: true, channel: true },
  });
  if (!existing) {
    return { status: "error", message: "Esa cuota ya no está en el listado." };
  }

  const parsed = await parseThirdTimeForm(formData, existing.channel);
  if (!parsed.ok) return parsed.state;

  const stored = await storeReceipt(existing.id, parsed.receipt, existing.receiptPath);
  if (!stored.ok) return stored.state;

  await prisma.thirdTimeFee.update({
    where: { id: existing.id },
    data: {
      ...feeData(parsed.value),
      ...(stored.receipt
        ? {
            receiptPath: stored.receipt.pathname,
            receiptContentType: stored.receipt.contentType,
          }
        : {}),
    },
  });

  revalidatePath(thirdTimePath);
  return { status: "saved", message: "Cuota actualizada." };
}

export async function deleteThirdTimeFee(formData: FormData): Promise<ThirdTimeActionState> {
  return audited("register-movements", () => deleteThirdTimeFeeRecord(formData));
}

async function deleteThirdTimeFeeRecord(formData: FormData): Promise<ThirdTimeActionState> {
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.thirdTimeFee.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return { status: "error", message: "Esa cuota ya no está en el listado." };
  }

  await prisma.thirdTimeFee.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });

  revalidatePath(thirdTimePath);
  return { status: "saved", message: "Cuota eliminada." };
}

async function parseThirdTimeForm(
  formData: FormData,
  currentChannel: string | null,
): Promise<
  | { ok: true; value: ParsedThirdTimeFee; receipt: File | null }
  | { ok: false; state: ThirdTimeActionState }
> {
  const [players, collaborators, channels] = await Promise.all([
    prisma.player.findMany({ select: { id: true, categoryCode: true } }),
    prisma.collaborator.findMany({
      where: { kind: { in: [...thirdTimeCollaboratorKinds] } },
      select: { id: true },
    }),
    prisma.thirdTimeChannel.findMany({ select: { description: true, status: true } }),
  ]);
  const parsed = validateThirdTimeFormValues(valuesFromForm(formData), {
    players,
    collaboratorIds: collaborators.map((collaborator) => collaborator.id),
    channelNames: allowedChannelNames(channels, currentChannel),
  });
  if (!parsed.ok) {
    return {
      ok: false,
      state: { status: "error", message: "Revisá los datos de la cuota.", errors: parsed.errors },
    };
  }

  const receipt = formData.get("receipt");
  const file = receipt instanceof File && receipt.size > 0 ? receipt : null;
  return { ok: true, value: parsed.value, receipt: file };
}

async function storeReceipt(
  feeId: string,
  file: File | null,
  previousPath: string | null,
): Promise<
  | { ok: true; receipt: { pathname: string; contentType: string } | null }
  | { ok: false; state: ThirdTimeActionState }
> {
  if (!file) return { ok: true, receipt: null };

  const checked = validateReceiptFile(file);
  if (!checked.ok) {
    return fieldError(checked.message);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return fieldError(receiptStorageUnavailableMessage);
  }

  try {
    const receipt = await savePrivateReceipt(feeId, file, "third-time");
    if (previousPath) {
      await removePrivateReceipt(previousPath).catch(() => undefined);
    }
    return { ok: true, receipt };
  } catch {
    return fieldError("No pudimos guardar el comprobante. Probá de nuevo.");
  }
}

function allowedChannelNames(
  channels: readonly { description: string; status: "ACTIVE" | "INACTIVE" }[],
  currentChannel: string | null,
): string[] {
  const names = channels
    .filter((channel) => channel.status === "ACTIVE" || channel.description === currentChannel)
    .map((channel) => channel.description);
  if (currentChannel && !names.includes(currentChannel)) names.push(currentChannel);
  return names;
}

function valuesFromForm(formData: FormData): ThirdTimeFormValues {
  return {
    playerId: String(formData.get("playerId") ?? ""),
    chargedOn: String(formData.get("chargedOn") ?? ""),
    paidOn: String(formData.get("paidOn") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    channel: String(formData.get("channel") ?? ""),
    status: String(formData.get("status") ?? ""),
    controllerId: String(formData.get("controllerId") ?? ""),
    receiptReference: String(formData.get("receiptReference") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

function feeData(value: ParsedThirdTimeFee) {
  return {
    playerId: value.playerId,
    categoryCode: value.categoryCode,
    chargedOn: utcDate(value.chargedOn),
    paidOn: value.paidOn ? utcDate(value.paidOn) : null,
    amount: value.amount,
    channel: value.channel,
    status: value.status,
    controllerId: value.controllerId,
    receiptReference: value.receiptReference,
    notes: value.notes,
  };
}

function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function fieldError(message: string): { ok: false; state: ThirdTimeActionState } {
  return {
    ok: false,
    state: { status: "error", message, errors: { receipt: message } },
  };
}
