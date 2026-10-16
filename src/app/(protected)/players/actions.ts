"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { audited } from "@/lib/require-access";
import { savePrivateAvatar, removePrivateAvatar } from "@/lib/player-avatar-store";
import { encryptDni } from "@/lib/player-dni";
import { loadFieldEncryptionKeyFromEnv } from "@/lib/field-encryption";
import { parseOptionalProfile, type OptionalProfileValue } from "@/lib/player-details";
import { dniStorageUnavailableMessage } from "@/lib/player-profile-form";
import { validateAvatarFile } from "@/lib/player-portrait";
import {
  applyRosterChange,
  clubDate,
  parsePlayerProfile,
  type PlayerProfile,
  type ProfileErrors,
} from "@/lib/roster";
import type { OptionalProfileErrors } from "@/lib/player-details";

export type PlayerFormErrors = ProfileErrors & OptionalProfileErrors;

export type RosterActionState = {
  status: "idle" | "saved" | "error";
  message: string;
  errors?: PlayerFormErrors;
};

export async function submitCreatePlayer(formData: FormData): Promise<RosterActionState> {
  return createPlayer({ status: "idle", message: "" }, formData);
}

export async function submitUpdatePlayer(formData: FormData): Promise<RosterActionState> {
  return updatePlayer({ status: "idle", message: "" }, formData);
}

export async function createPlayer(
  previous: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  return audited("manage-roster", () => createPlayerRecord(previous, formData));
}

async function createPlayerRecord(
  _previous: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {

  const categories = await prisma.category.findMany({ select: { code: true } });
  const parsed = parsePlayerForm(formData, categories.map((category) => category.code));
  if (!parsed.ok) {
    return parsed.state;
  }

  const dniResult = resolveDniCiphertext(parsed.optional, null, loadFieldEncryptionKeyFromEnv());
  if (!dniResult.ok) {
    return dniFieldError(dniResult.message);
  }

  const maxLegacy = await prisma.player.aggregate({ _max: { legacyId: true } });
  const legacyId = (maxLegacy._max.legacyId ?? 0) + 1;

  try {
    await prisma.player.create({
      data: {
        legacyId,
        displayName: parsed.profile.displayName,
        givenName: parsed.profile.givenName,
        familyName: parsed.profile.familyName,
        categoryCode: parsed.profile.categoryCode,
        rosterStatus: "ACTIVE",
        statusReason: null,
        statusChangedOn: null,
        ...optionalDates(parsed.optional),
        membershipNumber: parsed.optional.membershipNumber,
        jerseyNumber: parsed.optional.jerseyNumber,
        dniCiphertext: dniResult.value,
      },
    });
  } catch (error) {
    throw error;
  }

  revalidatePath("/players");
  return { status: "saved", message: "Jugadora creada." };
}

export async function updatePlayer(
  previous: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  return audited("manage-roster", () => updatePlayerRecord(previous, formData));
}

async function updatePlayerRecord(
  _previous: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {

  const playerId = text(formData, "playerId");
  if (playerId.length === 0) {
    return { status: "error", message: "No se encontró la jugadora." };
  }

  const categories = await prisma.category.findMany({ select: { code: true } });
  const parsed = parsePlayerForm(formData, categories.map((category) => category.code));
  if (!parsed.ok) {
    return parsed.state;
  }

  const existing = await prisma.player.findUnique({
    where: { id: playerId },
    select: { dniCiphertext: true },
  });
  if (!existing) {
    return { status: "error", message: "No se encontró la jugadora." };
  }

  const dniResult = resolveDniCiphertext(
    parsed.optional,
    existing.dniCiphertext,
    loadFieldEncryptionKeyFromEnv(),
  );
  if (!dniResult.ok) {
    return dniFieldError(dniResult.message);
  }

  try {
    await prisma.player.update({
      where: { id: playerId },
      data: {
        displayName: parsed.profile.displayName,
        givenName: parsed.profile.givenName,
        familyName: parsed.profile.familyName,
        categoryCode: parsed.profile.categoryCode,
        ...optionalDates(parsed.optional),
        membershipNumber: parsed.optional.membershipNumber,
        jerseyNumber: parsed.optional.jerseyNumber,
        dniCiphertext: dniResult.value,
      },
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
  previous: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  return audited("manage-roster", () => changeRosterStatusRecord(previous, formData));
}

async function changeRosterStatusRecord(
  _previous: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {

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

export async function submitUpdatePlayerAvatar(formData: FormData): Promise<RosterActionState> {
  return updatePlayerAvatar({ status: "idle", message: "" }, formData);
}

export async function updatePlayerAvatar(
  previous: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {
  return audited("manage-roster", () => updatePlayerAvatarRecord(previous, formData));
}

async function updatePlayerAvatarRecord(
  _previous: RosterActionState,
  formData: FormData,
): Promise<RosterActionState> {

  const playerId = text(formData, "playerId");
  if (playerId.length === 0) {
    return { status: "error", message: "No se encontró la jugadora." };
  }

  const upload = formData.get("avatar");
  if (!(upload instanceof File)) {
    return { status: "error", message: "Elegí una imagen." };
  }

  const verdict = validateAvatarFile({ type: upload.type, size: upload.size });
  if (!verdict.ok) {
    return { status: "error", message: verdict.message };
  }

  const existing = await prisma.player.findUnique({
    where: { id: playerId },
    select: { avatarPath: true },
  });
  if (!existing) {
    return { status: "error", message: "No se encontró la jugadora." };
  }

  let pathname: string;
  try {
    pathname = await savePrivateAvatar(playerId, upload);
  } catch (error) {
    console.error("player avatar upload failed", error);
    return { status: "error", message: "No se pudo guardar la foto." };
  }

  try {
    await prisma.player.update({
      where: { id: playerId },
      data: { avatarPath: pathname },
    });
  } catch (error) {
    await removePrivateAvatar(pathname).catch((cleanupError) => {
      console.error("player avatar cleanup failed", cleanupError);
    });
    if (isMissingRecord(error)) {
      return { status: "error", message: "No se encontró la jugadora." };
    }
    throw error;
  }

  if (existing.avatarPath) {
    await removePrivateAvatar(existing.avatarPath).catch((cleanupError) => {
      console.error("player avatar cleanup failed", cleanupError);
    });
  }

  revalidatePath("/players");
  return { status: "saved", message: "Foto guardada." };
}

function parsePlayerForm(
  formData: FormData,
  categoryCodes: readonly string[],
):
  | { ok: true; profile: PlayerProfile; optional: OptionalProfileValue }
  | { ok: false; state: RosterActionState } {
  const profile = parsePlayerProfile(
    {
      displayName: text(formData, "displayName"),
      givenName: text(formData, "givenName"),
      familyName: text(formData, "familyName"),
      categoryCode: text(formData, "categoryCode"),
    },
    categoryCodes,
  );

  const optional = parseOptionalProfile({
    birthDate: text(formData, "birthDate"),
    membershipNumber: text(formData, "membershipNumber"),
    jerseyNumber: text(formData, "jerseyNumber"),
    dni: text(formData, "dni"),
    joinedOn: text(formData, "joinedOn"),
  });

  if (!profile.ok || !optional.ok) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Revisá los campos marcados.",
        errors: {
          ...(profile.ok ? {} : profile.errors),
          ...(optional.ok ? {} : optional.errors),
        },
      },
    };
  }

  return { ok: true, profile: profile.value, optional: optional.value };
}

function optionalDates(optional: OptionalProfileValue) {
  return {
    birthDate: optional.birthDate ? new Date(`${optional.birthDate}T00:00:00.000Z`) : null,
    joinedOn: optional.joinedOn ? new Date(`${optional.joinedOn}T00:00:00.000Z`) : null,
  };
}

function resolveDniCiphertext(
  optional: OptionalProfileValue,
  existing: string | null,
  key: ReturnType<typeof loadFieldEncryptionKeyFromEnv>,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (!optional.dniNormalized) {
    return { ok: true, value: existing };
  }

  if (!key) {
    return {
      ok: false,
      message: dniStorageUnavailableMessage,
    };
  }

  return { ok: true, value: encryptDni(optional.dniNormalized, key) };
}

function dniFieldError(message: string): RosterActionState {
  return {
    status: "error",
    message: "Revisá los campos marcados.",
    errors: { dni: message },
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
