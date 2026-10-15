export const rosterInactiveReasons = ["TEMPORARY", "INJURY", "PERMANENT"] as const;

export type RosterInactiveReason = (typeof rosterInactiveReasons)[number];

export type RosterStatus = "ACTIVE" | "INACTIVE";

export const categoryDisplayOrder = [
  "PS",
  "5ta",
  "6ta",
  "7ma",
  "8va",
  "9na",
  "10ma",
  "Esc",
] as const;

const CLUB_TIME_ZONE = "America/Argentina/Buenos_Aires";
const DISPLAY_NAME_MAX = 120;
const PERSON_NAME_MAX = 80;

export type PlayerProfileInput = {
  displayName: string;
  givenName: string;
  familyName: string;
  categoryCode: string;
};

export type PlayerProfile = {
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  categoryCode: string;
};

export type ProfileErrors = {
  displayName?: string;
  givenName?: string;
  familyName?: string;
  categoryCode?: string;
};

export type RosterCategory = {
  code: string;
  description: string;
};

export type RosterChange =
  | { intent: "deactivate"; reason: string }
  | { intent: "reactivate" };

export type RosterSnapshot = {
  rosterStatus: RosterStatus;
  statusReason: RosterInactiveReason | null;
  statusChangedOn: string;
};

const reasonSet = new Set<string>(rosterInactiveReasons);

export function isRosterInactiveReason(value: string): value is RosterInactiveReason {
  return reasonSet.has(value);
}

export function parsePlayerProfile(
  input: PlayerProfileInput,
  categoryCodes: readonly string[],
): { ok: true; value: PlayerProfile } | { ok: false; errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const displayName = input.displayName.trim();

  if (displayName.length === 0) {
    errors.displayName = "Ingresá el alias de esta jugadora.";
  } else if (displayName.length > DISPLAY_NAME_MAX) {
    errors.displayName = `Usá ${DISPLAY_NAME_MAX} caracteres o menos.`;
  }

  const givenName = optionalName(input.givenName, "givenName", errors);
  const familyName = optionalName(input.familyName, "familyName", errors);
  const categoryCode = input.categoryCode.trim();

  if (!categoryCodes.includes(categoryCode)) {
    errors.categoryCode = "Elegí una categoría.";
  }

  if (errors.displayName || errors.givenName || errors.familyName || errors.categoryCode) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      displayName,
      givenName,
      familyName,
      categoryCode,
    },
  };
}

export function applyRosterChange(
  current: { rosterStatus: RosterStatus },
  change: RosterChange,
  on: string,
): { ok: true; value: RosterSnapshot } | { ok: false; message: string } {
  if (change.intent === "reactivate") {
    if (current.rosterStatus === "ACTIVE") {
      return { ok: false, message: "Esta jugadora ya está activa." };
    }

    return {
      ok: true,
      value: {
        rosterStatus: "ACTIVE",
        statusReason: null,
        statusChangedOn: on,
      },
    };
  }

  if (!isRosterInactiveReason(change.reason)) {
    return { ok: false, message: "Elegí una baja temporal, por lesión o permanente." };
  }

  return {
    ok: true,
    value: {
      rosterStatus: "INACTIVE",
      statusReason: change.reason,
      statusChangedOn: on,
    },
  };
}

export function groupPlayersByCategory<
  T extends {
    displayName: string;
    categoryCode: string;
    rosterStatus: RosterStatus;
  },
>(categories: readonly RosterCategory[], players: readonly T[]) {
  const groups = new Map<string, { category: RosterCategory; players: T[] }>();

  for (const category of [...categories].sort((left, right) =>
    compareCategoryCodes(left.code, right.code),
  )) {
    groups.set(category.code, { category, players: [] });
  }

  const extras: RosterCategory[] = [];

  for (const player of players) {
    if (!groups.has(player.categoryCode)) {
      const category = { code: player.categoryCode, description: player.categoryCode };
      extras.push(category);
      groups.set(player.categoryCode, { category, players: [] });
    }

    groups.get(player.categoryCode)?.players.push(player);
  }

  for (const group of groups.values()) {
    group.players.sort(comparePlayers);
  }

  return [
    ...[...categories]
      .sort((left, right) => compareCategoryCodes(left.code, right.code))
      .map((category) => groups.get(category.code))
      .filter((group) => group !== undefined),
    ...extras
      .sort((left, right) => compareCategoryCodes(left.code, right.code))
      .map((category) => groups.get(category.code))
      .filter((group) => group !== undefined),
  ];
}

export function clubDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function formatRosterDate(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function optionalName(
  value: string,
  field: "givenName" | "familyName",
  errors: ProfileErrors,
): string | null {
  const trimmed = value.trim();

  if (trimmed.length > PERSON_NAME_MAX) {
    errors[field] = `Usá ${PERSON_NAME_MAX} caracteres o menos.`;
    return null;
  }

  return trimmed.length === 0 ? null : trimmed;
}

export function formatCategoryLabel(category: { code: string; description: string }): string {
  return `${category.code} · ${category.description}`;
}

export function sortCategories<T extends { code: string }>(categories: readonly T[]): T[] {
  return [...categories].sort((left, right) => compareCategoryCodes(left.code, right.code));
}

function compareCategoryCodes(left: string, right: string): number {
  return categoryRank(left) - categoryRank(right) || left.localeCompare(right, "es");
}

function categoryRank(code: string): number {
  const index = categoryDisplayOrder.indexOf(code as (typeof categoryDisplayOrder)[number]);
  return index === -1 ? categoryDisplayOrder.length : index;
}

function comparePlayers(
  left: { displayName: string; rosterStatus: RosterStatus },
  right: { displayName: string; rosterStatus: RosterStatus },
): number {
  const status =
    Number(left.rosterStatus === "INACTIVE") - Number(right.rosterStatus === "INACTIVE");

  if (status !== 0) {
    return status;
  }

  return left.displayName.localeCompare(right.displayName, "es", { sensitivity: "base" });
}
