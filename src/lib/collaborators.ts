import type { Role } from "./access.ts";
import type { CollaboratorKind, CollaboratorStatus } from "./legacy-collaborators.ts";

export const collaboratorKinds = [
  "COORDINATOR",
  "THIRD_TIME",
  "SPONSOR",
  "SPECIAL_CASH",
] as const satisfies readonly CollaboratorKind[];

export const thirdTimeCollaboratorKinds = ["COORDINATOR", "THIRD_TIME"] as const satisfies readonly CollaboratorKind[];

export const collaboratorKindLabels: Record<CollaboratorKind, string> = {
  COORDINATOR: "Coordinador",
  THIRD_TIME: "3er Tiempo",
  SPONSOR: "Sponsor",
  SPECIAL_CASH: "Caja especial",
};

export const collaboratorStatusLabels: Record<CollaboratorStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

export const assignableRoles = [
  "ADMINISTRATOR",
  "COORDINATOR",
  "COLLABORATOR",
  "PLAYER",
  "PARENT",
  "VISITOR",
] as const satisfies readonly Role[];

export function nextCollaboratorLegacyId(currentMax: number | null): number {
  return (currentMax ?? 0) + 1;
}

const kindSet = new Set<string>(collaboratorKinds);
const roleSet = new Set<string>(assignableRoles);

export function parseCollaboratorAssignment(
  input: { kind: string; categoryCode: string },
  allowedCategoryCodes: readonly string[],
):
  | { ok: true; kind: CollaboratorKind; categoryCode: string | null }
  | { ok: false; message: string } {
  const kind = input.kind.trim();
  if (!kindSet.has(kind)) {
    return { ok: false, message: "Elegí un tipo de colaborador." };
  }

  const categoryCode = input.categoryCode.trim();
  if (categoryCode.length === 0) {
    return { ok: true, kind: kind as CollaboratorKind, categoryCode: null };
  }

  if (!allowedCategoryCodes.includes(categoryCode)) {
    return { ok: false, message: "Elegí una categoría." };
  }

  return { ok: true, kind: kind as CollaboratorKind, categoryCode };
}

const NAME_MAX = 80;

export function splitCollaboratorName(displayName: string): {
  givenName: string | null;
  familyName: string | null;
} {
  const trimmed = displayName.trim().replace(/\s+/g, " ");
  const space = trimmed.lastIndexOf(" ");
  if (space === -1) {
    return { givenName: trimmed.length === 0 ? null : trimmed, familyName: null };
  }
  return { givenName: trimmed.slice(0, space), familyName: trimmed.slice(space + 1) };
}

export function parseCollaboratorProfile(
  input: {
    displayName: string;
    givenName: string;
    familyName: string;
    kind: string;
    categoryCode: string;
    status: string;
    statusChangedOn: string;
  },
  allowedCategoryCodes: readonly string[],
):
  | {
      ok: true;
      displayName: string;
      givenName: string | null;
      familyName: string | null;
      kind: CollaboratorKind;
      categoryCode: string | null;
      status: CollaboratorStatus;
      statusChangedOn: string | null;
    }
  | { ok: false; message: string } {
  const displayName = input.displayName.trim();
  if (displayName.length === 0) {
    return { ok: false, message: "Ingresá el alias de este colaborador." };
  }
  if (displayName.length > NAME_MAX) {
    return { ok: false, message: `Usá ${NAME_MAX} caracteres o menos.` };
  }

  const givenName = optionalName(input.givenName);
  if (typeof givenName !== "string" && givenName !== null) {
    return givenName;
  }

  const familyName = optionalName(input.familyName);
  if (typeof familyName !== "string" && familyName !== null) {
    return familyName;
  }

  const assignment = parseCollaboratorAssignment(input, allowedCategoryCodes);
  if (!assignment.ok) {
    return assignment;
  }

  const status = input.status.trim();
  if (status !== "ACTIVE" && status !== "INACTIVE") {
    return { ok: false, message: "Elegí un estado." };
  }

  if (status === "ACTIVE") {
    return {
      ok: true,
      givenName,
      familyName,
      displayName,
      kind: assignment.kind,
      categoryCode: assignment.categoryCode,
      status,
      statusChangedOn: null,
    };
  }

  const statusChangedOn = calendarDate(input.statusChangedOn);
  if (statusChangedOn === null) {
    return { ok: false, message: "Indicá la fecha del estado." };
  }

  return {
    ok: true,
    givenName,
    familyName,
    displayName,
    kind: assignment.kind,
    categoryCode: assignment.categoryCode,
    status,
    statusChangedOn,
  };
}

function optionalName(value: string): string | null | { ok: false; message: string } {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > NAME_MAX) {
    return { ok: false, message: `Usá ${NAME_MAX} caracteres o menos.` };
  }
  return trimmed;
}

function calendarDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function parseCollaboratorLink(input: {
  userId: string;
  role: string;
}):
  | { ok: true; unlink: true }
  | { ok: true; unlink: false; userId: string; role: Role }
  | { ok: false; message: string } {
  const userId = input.userId.trim();
  if (userId.length === 0) {
    return { ok: true, unlink: true };
  }

  const role = input.role.trim();
  if (!roleSet.has(role)) {
    return { ok: false, message: "Elegí un rol." };
  }

  return { ok: true, unlink: false, userId, role: role as Role };
}
