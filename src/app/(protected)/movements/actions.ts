"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  removePrivateReceipt,
  savePrivateReceipt,
} from "@/lib/expense-receipt-store";
import {
  receiptStorageUnavailableMessage,
  validateExpenseFormValues,
  validateReceiptFile,
  verifiedFromReceipt,
  type ExpenseFormErrors,
  type ExpenseFormValues,
  type ParsedExpense,
} from "@/lib/expenses";
import { requireAccess } from "@/lib/require-access";

export type ExpenseActionState = {
  status: "idle" | "saved" | "error";
  message: string;
  errors?: ExpenseFormErrors;
};

const movementsPath = "/movements";

export async function createExpense(formData: FormData): Promise<ExpenseActionState> {
  await requireAccess("register-movements");
  const parsed = await parseExpenseForm(formData);
  if (!parsed.ok) return parsed.state;

  const created = await prisma.expense.create({
    data: {
      spentOn: utcDate(parsed.value.spentOn),
      expenseTypeId: parsed.value.expenseTypeId,
      unitAmount: parsed.value.unitAmount,
      quantity: parsed.value.quantity,
      collaboratorId: parsed.value.collaboratorId,
      notes: parsed.value.notes,
      verified: verifiedFromReceipt(false),
    },
  });

  const stored = await storeReceipt(created.id, parsed.receipt, null);
  if (!stored.ok) {
    await prisma.expense.delete({ where: { id: created.id } });
    return stored.state;
  }
  if (stored.receipt) {
    await prisma.expense.update({
      where: { id: created.id },
      data: {
        receiptPath: stored.receipt.pathname,
        receiptContentType: stored.receipt.contentType,
        verified: verifiedFromReceipt(true),
      },
    });
  }

  revalidatePath(movementsPath);
  return { status: "saved", message: "Gasto registrado." };
}

export async function updateExpense(formData: FormData): Promise<ExpenseActionState> {
  await requireAccess("register-movements");
  const id = String(formData.get("id") ?? "");
  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { id: true, receiptPath: true },
  });
  if (!existing) {
    return { status: "error", message: "Ese gasto ya no está en el listado." };
  }

  const parsed = await parseExpenseForm(formData);
  if (!parsed.ok) return parsed.state;

  const stored = await storeReceipt(existing.id, parsed.receipt, existing.receiptPath);
  if (!stored.ok) return stored.state;

  await prisma.expense.update({
    where: { id: existing.id },
    data: {
      spentOn: utcDate(parsed.value.spentOn),
      expenseTypeId: parsed.value.expenseTypeId,
      unitAmount: parsed.value.unitAmount,
      quantity: parsed.value.quantity,
      collaboratorId: parsed.value.collaboratorId,
      notes: parsed.value.notes,
      verified: verifiedFromReceipt(Boolean(stored.receipt) || Boolean(existing.receiptPath)),
      ...(stored.receipt
        ? {
            receiptPath: stored.receipt.pathname,
            receiptContentType: stored.receipt.contentType,
          }
        : {}),
    },
  });

  revalidatePath(movementsPath);
  return { status: "saved", message: "Gasto actualizado." };
}

async function parseExpenseForm(formData: FormData): Promise<
  | { ok: true; value: ParsedExpense; receipt: File | null }
  | { ok: false; state: ExpenseActionState }
> {
  const [expenseTypes, collaborators] = await Promise.all([
    prisma.expenseType.findMany({ select: { id: true } }),
    prisma.collaborator.findMany({ select: { id: true } }),
  ]);
  const parsed = validateExpenseFormValues(valuesFromForm(formData), {
    expenseTypeIds: expenseTypes.map((expenseType) => expenseType.id),
    collaboratorIds: collaborators.map((collaborator) => collaborator.id),
  });
  if (!parsed.ok) {
    return {
      ok: false,
      state: { status: "error", message: "Revisá los datos del gasto.", errors: parsed.errors },
    };
  }

  const receipt = formData.get("receipt");
  const file = receipt instanceof File && receipt.size > 0 ? receipt : null;
  return { ok: true, value: parsed.value, receipt: file };
}

async function storeReceipt(
  expenseId: string,
  file: File | null,
  previousPath: string | null,
): Promise<
  | { ok: true; receipt: { pathname: string; contentType: string } | null }
  | { ok: false; state: ExpenseActionState }
> {
  if (!file) return { ok: true, receipt: null };

  const checked = validateReceiptFile(file);
  if (!checked.ok) {
    return fieldError("receipt", checked.message);
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return fieldError("receipt", receiptStorageUnavailableMessage);
  }

  try {
    const receipt = await savePrivateReceipt(expenseId, file);
    if (previousPath) {
      await removePrivateReceipt(previousPath).catch(() => undefined);
    }
    return { ok: true, receipt };
  } catch {
    return fieldError("receipt", "No pudimos guardar el comprobante. Probá de nuevo.");
  }
}

function valuesFromForm(formData: FormData): ExpenseFormValues {
  return {
    spentOn: String(formData.get("spentOn") ?? ""),
    expenseTypeId: String(formData.get("expenseTypeId") ?? ""),
    unitAmount: String(formData.get("unitAmount") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    collaboratorId: String(formData.get("collaboratorId") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function fieldError(
  field: keyof ExpenseFormErrors,
  message: string,
): { ok: false; state: ExpenseActionState } {
  return {
    ok: false,
    state: { status: "error", message, errors: { [field]: message } },
  };
}
