import type { RosterCategory, RosterStatus } from "./roster.ts";

export type RosterBrowseStatus = "all" | "active" | "inactive";

export type RosterBrowseQuery = {
  text: string;
  status: RosterBrowseStatus;
  categoryCode: string | null;
};

export type RosterBrowsePlayer = {
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  legacyId: number;
  categoryCode: string;
  rosterStatus: RosterStatus;
};

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function matchesText(player: RosterBrowsePlayer, needle: string): boolean {
  if (needle.length === 0) {
    return true;
  }

  const fields = [player.displayName, player.givenName, player.familyName];

  for (const field of fields) {
    if (field !== null && fold(field).includes(needle)) {
      return true;
    }
  }

  return String(player.legacyId).includes(needle);
}

function matchesStatus(player: RosterBrowsePlayer, status: RosterBrowseStatus): boolean {
  if (status === "all") {
    return true;
  }

  return player.rosterStatus === (status === "active" ? "ACTIVE" : "INACTIVE");
}

export function browseRoster<T extends RosterBrowsePlayer>(
  groups: readonly { category: RosterCategory; players: readonly T[] }[],
  query: RosterBrowseQuery,
): {
  groups: { category: RosterCategory; players: T[] }[];
  totals: { shown: number; active: number; inactive: number };
  categories: { code: string; description: string; count: number }[];
} {
  const needle = fold(query.text.trim());
  const matched = groups.map((group) => ({
    category: group.category,
    players: group.players.filter(
      (player) => matchesText(player, needle) && matchesStatus(player, query.status),
    ),
  }));
  const categories = matched.flatMap((group) =>
    group.players.length === 0
      ? []
      : [
          {
            code: group.category.code,
            description: group.category.description,
            count: group.players.length,
          },
        ],
  );
  const visible =
    query.categoryCode === null
      ? matched
      : matched.filter((group) => group.category.code === query.categoryCode);
  const resultGroups = visible.flatMap((group) =>
    group.players.length === 0 ? [] : [{ category: group.category, players: group.players }],
  );
  let shown = 0;
  let active = 0;
  let inactive = 0;

  for (const group of resultGroups) {
    for (const player of group.players) {
      shown += 1;

      if (player.rosterStatus === "ACTIVE") {
        active += 1;
      } else {
        inactive += 1;
      }
    }
  }

  return {
    groups: resultGroups,
    totals: { shown, active, inactive },
    categories,
  };
}
