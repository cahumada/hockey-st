"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import {
  applyRosterChange,
  clubDate,
  parsePlayerProfile,
  type ProfileErrors,
} from "@/lib/roster";

export type RosterActionState = {
  status: "idle" | "saved" | "error";
  message: string;
  errors?: ProfileErrors;
};

export async function updatePlayer(
  _previous: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  await requireAccess("manage-roster");

  const playerId = text(formData, "playerId");
  if (playerId.length === 0) {
    return { status: "error", message: "No se encontró la jugadora." };
  }

  const categories = await prisma.category.findMany({ select: { code: true } });
  const parsed = parsePlayerProfile(
    {
      displayName: text(formData, "displayName"),
      givenName: text(formData, "givenName"),
      familyName: text(formData, "familyName"),
      categoryCode: text(formData, "categoryCode"),
    },
    categories.map((category) => category.code),
  );

  if (!parsed.ok) {
    return {
      status: "error",
      message: "Revisá los campos marcados.",
      errors: parsed.errors,
    };
  }

  try {
    await prisma.player.update({
      where: { id: playerId },
      data: parsed.value,
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return { status: "error", message: "No se encontró la jugadora." };
    }
    throw error;
  }

  revalidatePath("/players");
  return { status: "saved", message: "Guardado." };
}

export async function changeRosterStatus(
  _previous: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  await requireAccess("manage-roster");

  const playerId = text(formData, "playerId");
  const intent = text(formData, "intent");
  if (playerId.length === 0) {
    return { status: "error", message: "No se encontró la jugadora." };
  }
  if (intent !== "deactivate" && intent !== "reactivate") {
    return { status: "error", message: "Elegí una baja temporal, por lesión o permanente." };
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { rosterStatus: true },
  });
  if (!player) {
    return { status: "error", message: "No se encontró la jugadora." };
  }

  const next = applyRosterChange(
    player,
    intent === "reactivate"
      ? { intent: "reactivate" }
      : { intent: "deactivate", reason: text(formData, "reason") },
    clubDate(new Date()),
  );
  if (!next.ok) {
    return { status: "error", message: next.message };
  }

  try {
    await prisma.player.update({
      where: { id: playerId },
      data: {
        rosterStatus: next.value.rosterStatus,
        statusReason: next.value.statusReason,
        statusChangedOn: new Date(`${next.value.statusChangedOn}T00:00:00.000Z`),
      },
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return { status: "error", message: "No se encontró la jugadora." };
    }
    throw error;
  }

  revalidatePath("/players");
  return {
    status: "saved",
    message: next.value.rosterStatus === "ACTIVE" ? "Reactivada." : "Baja guardada.",
  };
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isMissingRecord(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2025"
  );
}
