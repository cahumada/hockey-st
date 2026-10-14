import { normalizeDni } from "./player-dni.ts";
import { clubDate } from "./roster.ts";

export type OptionalProfileInput = {
  birthDate: string;
  membershipNumber: string;
  jerseyNumber: string;
  dni: string;
  joinedOn: string;
};

export type OptionalProfileValue = {
  birthDate: string | null;
  membershipNumber: string | null;
  jerseyNumber: number | null;
  dniNormalized: string | null;
  joinedOn: string | null;
};

export type OptionalProfileErrors = {
  birthDate?: string;
  membershipNumber?: string;
  jerseyNumber?: string;
  dni?: string;
  joinedOn?: string;
};

const MEMBERSHIP_MAX = 32;
const JERSEY_MIN = 1;
const JERSEY_MAX = 999;

export function parseOptionalProfile(
  input: OptionalProfileInput,
): { ok: true; value: OptionalProfileValue } | { ok: false; errors: OptionalProfileErrors } {
  const errors: OptionalProfileErrors = {};
  const birthDate = parseOptionalDate(input.birthDate, "birthDate", errors);
  const joinedOn = parseOptionalDate(input.joinedOn, "joinedOn", errors);
  const membershipNumber = parseMembershipNumber(input.membershipNumber, errors);
  const jerseyNumber = parseJerseyNumber(input.jerseyNumber, errors);
  const dniNormalized = parseOptionalDni(input.dni, errors);

  if (
    errors.birthDate ||
    errors.membershipNumber ||
    errors.jerseyNumber ||
    errors.dni ||
    errors.joinedOn
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      birthDate,
      membershipNumber,
      jerseyNumber,
      dniNormalized,
      joinedOn,
    },
  };
}

export function playerAgeYears(birthDate: string, today = clubDate(new Date())): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return null;
  }

  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function formatPlayerAge(birthDate: string, today = clubDate(new Date())): string | null {
  const years = playerAgeYears(birthDate, today);
  if (years === null) {
    return null;
  }
  return years === 1 ? "1 año" : `${years} años`;
}

function parseOptionalDate(
  value: string,
  field: "birthDate" | "joinedOn",
  errors: OptionalProfileErrors,
): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    errors[field] = "Usá el formato AAAA-MM-DD.";
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatRosterUtc(date) !== trimmed) {
    errors[field] = "Elegí una fecha válida.";
    return null;
  }

  return trimmed;
}

function parseMembershipNumber(value: string, errors: OptionalProfileErrors): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > MEMBERSHIP_MAX) {
    errors.membershipNumber = `Usá ${MEMBERSHIP_MAX} caracteres o menos.`;
    return null;
  }
  return trimmed;
}

function parseJerseyNumber(value: string, errors: OptionalProfileErrors): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    errors.jerseyNumber = "Ingresá un número de camiseta.";
    return null;
  }

  const number = Number(trimmed);
  if (number < JERSEY_MIN || number > JERSEY_MAX) {
    errors.jerseyNumber = `Usá un número entre ${JERSEY_MIN} y ${JERSEY_MAX}.`;
    return null;
  }

  return number;
}

function parseOptionalDni(value: string, errors: OptionalProfileErrors): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const normalized = normalizeDni(trimmed);
  if (!normalized) {
    errors.dni = "El DNI tiene que tener 7 u 8 dígitos.";
    return null;
  }

  return normalized;
}

function formatRosterUtc(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
