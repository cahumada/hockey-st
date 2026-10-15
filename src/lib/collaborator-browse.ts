import type { CollaboratorKind, CollaboratorStatus } from "./legacy-collaborators.ts";

export type CollaboratorBrowseStatus = "all" | "active" | "inactive";

export type CollaboratorBrowseQuery = {
  text: string;
  status: CollaboratorBrowseStatus;
  kind: CollaboratorKind | null;
  category: "all" | "none" | string;
};

export type CollaboratorBrowsePerson = {
  displayName: string;
  legacyId: number;
  kind: CollaboratorKind;
  categoryCode: string | null;
  status: CollaboratorStatus;
};

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function matchesText(person: CollaboratorBrowsePerson, needle: string): boolean {
  if (needle.length === 0) {
    return true;
  }

  return fold(person.displayName).includes(needle) || String(person.legacyId).includes(needle);
}

function matchesStatus(person: CollaboratorBrowsePerson, status: CollaboratorBrowseStatus): boolean {
  if (status === "all") {
    return true;
  }

  return person.status === (status === "active" ? "ACTIVE" : "INACTIVE");
}

function matchesKind(person: CollaboratorBrowsePerson, kind: CollaboratorKind | null): boolean {
  return kind === null || person.kind === kind;
}

function matchesCategory(person: CollaboratorBrowsePerson, category: CollaboratorBrowseQuery["category"]): boolean {
  if (category === "all") {
    return true;
  }

  if (category === "none") {
    return person.categoryCode === null;
  }

  return person.categoryCode === category;
}

export function browseCollaborators<T extends CollaboratorBrowsePerson>(
  people: readonly T[],
  query: CollaboratorBrowseQuery,
): {
  people: T[];
  totals: { shown: number; active: number; inactive: number };
  kinds: { kind: CollaboratorKind; count: number }[];
  categories: { category: "none" | string; count: number }[];
} {
  const needle = fold(query.text.trim());
  const textAndStatus = people.filter(
    (person) => matchesText(person, needle) && matchesStatus(person, query.status),
  );
  const visible = textAndStatus.filter(
    (person) => matchesKind(person, query.kind) && matchesCategory(person, query.category),
  );
  const kindSource = textAndStatus.filter((person) => matchesCategory(person, query.category));
  const categorySource = textAndStatus.filter((person) => matchesKind(person, query.kind));

  return {
    people: visible,
    totals: countStatuses(visible),
    kinds: countKinds(kindSource),
    categories: countCategories(categorySource),
  };
}

function countStatuses<T extends CollaboratorBrowsePerson>(people: readonly T[]) {
  let active = 0;
  let inactive = 0;

  for (const person of people) {
    if (person.status === "ACTIVE") {
      active += 1;
    } else {
      inactive += 1;
    }
  }

  return { shown: people.length, active, inactive };
}

function countKinds<T extends CollaboratorBrowsePerson>(people: readonly T[]) {
  const counts = new Map<CollaboratorKind, number>();

  for (const person of people) {
    counts.set(person.kind, (counts.get(person.kind) ?? 0) + 1);
  }

  return [...counts].map(([kind, count]) => ({ kind, count }));
}

function countCategories<T extends CollaboratorBrowsePerson>(people: readonly T[]) {
  const counts = new Map<string, number>();
  let none = 0;

  for (const person of people) {
    if (person.categoryCode === null) {
      none += 1;
      continue;
    }

    counts.set(person.categoryCode, (counts.get(person.categoryCode) ?? 0) + 1);
  }

  const categories = [...counts].map(([category, count]) => ({ category, count }));
  if (none > 0) {
    categories.push({ category: "none", count: none });
  }

  return categories;
}
