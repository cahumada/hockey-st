import { parseOptionalProfile, type OptionalProfileErrors } from "./player-details.ts";
import { parsePlayerProfile, type ProfileErrors } from "./roster.ts";

export type PlayerProfileFormErrors = ProfileErrors & OptionalProfileErrors;

export const dniStorageUnavailableMessage =
  "No podemos registrar el DNI en este entorno. Dejá el campo vacío o pedí ayuda al administrador del club.";

export type PlayerProfileFormValues = {
  displayName: string;
  givenName: string;
  familyName: string;
  categoryCode: string;
  birthDate: string;
  membershipNumber: string;
  jerseyNumber: string;
  dni: string;
  joinedOn: string;
};

export function playerToProfileFormValues(
  player: {
    displayName: string;
    givenName: string | null;
    familyName: string | null;
    categoryCode: string;
    birthDate: string | null;
    membershipNumber: string | null;
    jerseyNumber: number | null;
    joinedOn: string | null;
  } | null,
  fallbackCategoryCode: string,
): PlayerProfileFormValues {
  return {
    displayName: player?.displayName ?? "",
    givenName: player?.givenName ?? "",
    familyName: player?.familyName ?? "",
    categoryCode: player?.categoryCode ?? fallbackCategoryCode,
    birthDate: player?.birthDate ?? "",
    membershipNumber: player?.membershipNumber ?? "",
    jerseyNumber: player?.jerseyNumber?.toString() ?? "",
    dni: "",
    joinedOn: player?.joinedOn ?? "",
  };
}

export function validatePlayerProfileFormValues(
  values: PlayerProfileFormValues,
  categoryCodes: readonly string[],
  options: { dniStorageReady: boolean },
): { ok: true } | { ok: false; errors: PlayerProfileFormErrors } {
  const profile = parsePlayerProfile(
    {
      displayName: values.displayName,
      givenName: values.givenName,
      familyName: values.familyName,
      categoryCode: values.categoryCode,
    },
    categoryCodes,
  );

  const optional = parseOptionalProfile({
    birthDate: values.birthDate,
    membershipNumber: values.membershipNumber,
    jerseyNumber: values.jerseyNumber,
    dni: values.dni,
    joinedOn: values.joinedOn,
  });

  const errors: PlayerProfileFormErrors = {
    ...(profile.ok ? {} : profile.errors),
    ...(optional.ok ? {} : optional.errors),
  };

  if (!options.dniStorageReady && values.dni.trim().length > 0) {
    errors.dni = dniStorageUnavailableMessage;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}

export function profileValuesToFormData(
  values: PlayerProfileFormValues,
  playerId?: string,
): FormData {
  const formData = new FormData();
  if (playerId) {
    formData.set("playerId", playerId);
  }

  formData.set("displayName", values.displayName);
  formData.set("givenName", values.givenName);
  formData.set("familyName", values.familyName);
  formData.set("categoryCode", values.categoryCode);
  formData.set("birthDate", values.birthDate);
  formData.set("membershipNumber", values.membershipNumber);
  formData.set("jerseyNumber", values.jerseyNumber);
  formData.set("dni", values.dni);
  formData.set("joinedOn", values.joinedOn);

  return formData;
}
