import assert from "node:assert/strict";
import { test } from "node:test";
import { browseRoster } from "./roster-browse.ts";

const primera = { code: "PS", description: "Primera" };
const novena = { code: "9na", description: "Novena" };
const escuelita = { code: "Esc", description: "Escuelita" };

type Sample = {
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  legacyId: number;
  categoryCode: string;
  rosterStatus: "ACTIVE" | "INACTIVE";
};

function sample(
  overrides: Partial<Sample> &
    Pick<Sample, "displayName" | "legacyId" | "categoryCode" | "rosterStatus">,
): Sample {
  return {
    givenName: null,
    familyName: null,
    ...overrides,
  };
}

test("search matches accented display, given, and family names, and a legacy id", () => {
  const byGiven = sample({
    displayName: "Lopez, Ana",
    givenName: "García",
    familyName: "Lopez",
    legacyId: 11,
    categoryCode: "PS",
    rosterStatus: "ACTIVE",
  });
  const byDisplay = sample({
    displayName: "García, Sol",
    givenName: "Sol",
    familyName: "Perez",
    legacyId: 12,
    categoryCode: "PS",
    rosterStatus: "ACTIVE",
  });
  const unrelated = sample({
    displayName: "Diaz, Nora",
    givenName: "Nora",
    familyName: "Diaz",
    legacyId: 13,
    categoryCode: "PS",
    rosterStatus: "ACTIVE",
  });
  const byFamily = sample({
    displayName: "Ruiz, Ines",
    givenName: "Ines",
    familyName: "García",
    legacyId: 14,
    categoryCode: "9na",
    rosterStatus: "ACTIVE",
  });
  const byLegacy = sample({
    displayName: "Paz, Luz",
    givenName: "Luz",
    familyName: "Paz",
    legacyId: 60,
    categoryCode: "9na",
    rosterStatus: "ACTIVE",
  });
  const primeraPlayers = [byGiven, byDisplay, unrelated];
  const novenaPlayers = [byFamily, byLegacy];
  const groups = [
    { category: primera, players: primeraPlayers },
    { category: novena, players: novenaPlayers },
  ];

  const byName = browseRoster(groups, {
    text: "  garcia  ",
    status: "all",
    categoryCode: null,
  });

  assert.deepEqual(byName.groups, [
    { category: primera, players: [byGiven, byDisplay] },
    { category: novena, players: [byFamily] },
  ]);
  assert.deepEqual(byName.categories, [
    { code: "PS", description: "Primera", count: 2 },
    { code: "9na", description: "Novena", count: 1 },
  ]);
  assert.deepEqual(byName.totals, { shown: 3, active: 3, inactive: 0 });
  assert.equal(groups[0]?.players, primeraPlayers);
  assert.equal(groups[1]?.players, novenaPlayers);

  const byId = browseRoster(groups, { text: "60", status: "all", categoryCode: null });

  assert.deepEqual(byId.groups, [{ category: novena, players: [byLegacy] }]);
  assert.deepEqual(byId.totals, { shown: 1, active: 1, inactive: 0 });
});

test("inactive status keeps inactive players and category counts ignore the selected category", () => {
  const novenaInactive = sample({
    displayName: "Gamma",
    legacyId: 3,
    categoryCode: "9na",
    rosterStatus: "INACTIVE",
  });
  const novenaActive = sample({
    displayName: "Delta",
    legacyId: 4,
    categoryCode: "9na",
    rosterStatus: "ACTIVE",
  });
  const psActive = sample({
    displayName: "Alfa",
    legacyId: 1,
    categoryCode: "PS",
    rosterStatus: "ACTIVE",
  });
  const psInactive = sample({
    displayName: "Beta",
    legacyId: 2,
    categoryCode: "PS",
    rosterStatus: "INACTIVE",
  });
  const groups = [
    { category: novena, players: [novenaInactive, novenaActive] },
    { category: primera, players: [psActive, psInactive] },
  ];

  const result = browseRoster(groups, {
    text: "   ",
    status: "inactive",
    categoryCode: "PS",
  });

  assert.deepEqual(result.groups, [{ category: primera, players: [psInactive] }]);
  assert.deepEqual(result.categories, [
    { code: "9na", description: "Novena", count: 1 },
    { code: "PS", description: "Primera", count: 1 },
  ]);
  assert.deepEqual(result.totals, { shown: 1, active: 0, inactive: 1 });
});

test("a category filter returns only that group and omits an empty source group", () => {
  const active = sample({
    displayName: "Alfa",
    legacyId: 1,
    categoryCode: "PS",
    rosterStatus: "ACTIVE",
  });
  const inactive = sample({
    displayName: "Beta",
    legacyId: 2,
    categoryCode: "PS",
    rosterStatus: "INACTIVE",
  });
  const nueve = sample({
    displayName: "Gamma",
    legacyId: 3,
    categoryCode: "9na",
    rosterStatus: "ACTIVE",
  });
  const groups = [
    { category: primera, players: [active, inactive] },
    { category: escuelita, players: [] },
    { category: novena, players: [nueve] },
  ];

  const selected = browseRoster(groups, {
    text: "",
    status: "all",
    categoryCode: "9na",
  });

  assert.deepEqual(selected.groups, [{ category: novena, players: [nueve] }]);
  assert.deepEqual(selected.totals, { shown: 1, active: 1, inactive: 0 });
  assert.deepEqual(selected.categories, [
    { code: "PS", description: "Primera", count: 2 },
    { code: "9na", description: "Novena", count: 1 },
  ]);

  const unfiltered = browseRoster(groups, {
    text: "",
    status: "all",
    categoryCode: null,
  });

  assert.deepEqual(unfiltered.groups, [
    { category: primera, players: [active, inactive] },
    { category: novena, players: [nueve] },
  ]);
  assert.equal(
    unfiltered.groups.some((group) => group.players.length === 0),
    false,
  );
});

test("no match returns no groups, no categories, and zero totals", () => {
  const groups = [
    {
      category: primera,
      players: [
        sample({
          displayName: "Alfa",
          legacyId: 1,
          categoryCode: "PS",
          rosterStatus: "ACTIVE",
        }),
        sample({
          displayName: "Beta",
          legacyId: 2,
          categoryCode: "PS",
          rosterStatus: "INACTIVE",
        }),
      ],
    },
  ];

  assert.deepEqual(browseRoster(groups, { text: "zzzz", status: "all", categoryCode: null }), {
    groups: [],
    categories: [],
    totals: { shown: 0, active: 0, inactive: 0 },
  });
});

test("text, status, and category filters compose", () => {
  const psActive = sample({
    displayName: "García, Sol",
    givenName: "Sol",
    familyName: "Perez",
    legacyId: 21,
    categoryCode: "PS",
    rosterStatus: "ACTIVE",
  });
  const psInactive = sample({
    displayName: "Lopez, Ana",
    givenName: "Ana",
    familyName: "García",
    legacyId: 22,
    categoryCode: "PS",
    rosterStatus: "INACTIVE",
  });
  const novenaActive = sample({
    displayName: "Ruiz, Ines",
    givenName: "García",
    familyName: "Ruiz",
    legacyId: 23,
    categoryCode: "9na",
    rosterStatus: "ACTIVE",
  });
  const novenaInactive = sample({
    displayName: "García, Baja",
    givenName: "Baja",
    familyName: "Paz",
    legacyId: 24,
    categoryCode: "9na",
    rosterStatus: "INACTIVE",
  });
  const novenaOther = sample({
    displayName: "Diaz, Nora",
    givenName: "Nora",
    familyName: "Diaz",
    legacyId: 25,
    categoryCode: "9na",
    rosterStatus: "ACTIVE",
  });
  const groups = [
    { category: primera, players: [psActive, psInactive] },
    { category: novena, players: [novenaActive, novenaInactive, novenaOther] },
  ];

  const result = browseRoster(groups, {
    text: "garcia",
    status: "active",
    categoryCode: "9na",
  });

  assert.deepEqual(result.groups, [{ category: novena, players: [novenaActive] }]);
  assert.deepEqual(result.categories, [
    { code: "PS", description: "Primera", count: 1 },
    { code: "9na", description: "Novena", count: 1 },
  ]);
  assert.deepEqual(result.totals, { shown: 1, active: 1, inactive: 0 });
});
