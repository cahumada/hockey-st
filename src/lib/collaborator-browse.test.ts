import assert from "node:assert/strict";
import { test } from "node:test";
import { browseCollaborators } from "./collaborator-browse.ts";

const people = [
  row(1, "Anabella", "COORDINATOR", null, "ACTIVE"),
  row(2, "Natalia Palladino", "THIRD_TIME", "9na", "ACTIVE"),
  row(4, "Rosana Lavagnino", "THIRD_TIME", "7ma", "INACTIVE"),
  row(9, "Pablo Bellemans", "SPONSOR", null, "INACTIVE"),
];

function row(
  legacyId: number,
  displayName: string,
  kind: "COORDINATOR" | "THIRD_TIME" | "SPONSOR" | "SPECIAL_CASH",
  categoryCode: string | null,
  status: "ACTIVE" | "INACTIVE",
) {
  return { legacyId, displayName, kind, categoryCode, status };
}

test("search matches an accented name and a legacy id", () => {
  const searched = browseCollaborators(people, {
    text: "lavagnino",
    status: "all",
    kind: null,
    category: "all",
  });
  assert.deepEqual(
    searched.people.map((person) => person.legacyId),
    [4],
  );

  const byId = browseCollaborators(people, {
    text: "2",
    status: "all",
    kind: null,
    category: "all",
  });
  assert.deepEqual(
    byId.people.map((person) => person.legacyId),
    [2],
  );
});

test("status, kind, and category filters compose and counts ignore their own selection", () => {
  const filtered = browseCollaborators(people, {
    text: "",
    status: "inactive",
    kind: "THIRD_TIME",
    category: "7ma",
  });
  assert.deepEqual(
    filtered.people.map((person) => person.legacyId),
    [4],
  );
  assert.deepEqual(filtered.totals, { shown: 1, active: 0, inactive: 1 });
  assert.deepEqual(filtered.kinds, [{ kind: "THIRD_TIME", count: 1 }]);
  assert.deepEqual(filtered.categories, [{ category: "7ma", count: 1 }]);

  const inactive = browseCollaborators(people, {
    text: "",
    status: "inactive",
    kind: null,
    category: "all",
  });
  assert.deepEqual(inactive.kinds, [
    { kind: "THIRD_TIME", count: 1 },
    { kind: "SPONSOR", count: 1 },
  ]);
  assert.deepEqual(inactive.categories, [
    { category: "7ma", count: 1 },
    { category: "none", count: 1 },
  ]);
});

test("no match returns no people and zero totals", () => {
  const empty = browseCollaborators(people, {
    text: "nadie",
    status: "all",
    kind: null,
    category: "all",
  });
  assert.deepEqual(empty.people, []);
  assert.deepEqual(empty.totals, { shown: 0, active: 0, inactive: 0 });
});
