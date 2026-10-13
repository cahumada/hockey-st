import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyRosterChange,
  clubDate,
  formatRosterDate,
  groupPlayersByCategory,
  parsePlayerProfile,
} from "./roster.ts";

const categories = [
  { code: "9na", description: "Novena" },
  { code: "PS", description: "Primera" },
  { code: "Esc", description: "Escuelita" },
];

test("profile edit keeps a trimmed display name and optional given and family names", () => {
  const parsed = parsePlayerProfile(
    {
      displayName: "  Aguirre, Gianella  ",
      givenName: " Gianella ",
      familyName: " Aguirre ",
      categoryCode: "7ma",
    },
    ["7ma", "PS"],
  );

  assert.deepEqual(parsed, {
    ok: true,
    value: {
      displayName: "Aguirre, Gianella",
      givenName: "Gianella",
      familyName: "Aguirre",
      categoryCode: "7ma",
    },
  });
});

test("profile edit rejects a blank display name and an unknown category", () => {
  const parsed = parsePlayerProfile(
    {
      displayName: "   ",
      givenName: "",
      familyName: "",
      categoryCode: "missing",
    },
    ["PS"],
  );

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.errors.displayName, "Ingresá el nombre que se muestra de esta jugadora.");
    assert.equal(parsed.errors.categoryCode, "Elegí una categoría.");
    assert.equal(parsed.errors.givenName, undefined);
  }
});

test("deactivation requires a temporary, injury, or permanent reason", () => {
  const active = { rosterStatus: "ACTIVE" as const };

  assert.deepEqual(applyRosterChange(active, { intent: "deactivate", reason: "INJURY" }, "2026-10-13"), {
    ok: true,
    value: {
      rosterStatus: "INACTIVE",
      statusReason: "INJURY",
      statusChangedOn: "2026-10-13",
    },
  });

  const rejected = applyRosterChange(active, { intent: "deactivate", reason: "viaje" }, "2026-10-13");
  assert.equal(rejected.ok, false);
  if (!rejected.ok) {
    assert.equal(rejected.message, "Elegí una baja temporal, por lesión o permanente.");
  }
});

test("reactivation clears the leave and is refused when the player is already active", () => {
  assert.deepEqual(
    applyRosterChange(
      { rosterStatus: "INACTIVE" },
      { intent: "reactivate" },
      "2026-10-13",
    ),
    {
      ok: true,
      value: {
        rosterStatus: "ACTIVE",
        statusReason: null,
        statusChangedOn: "2026-10-13",
      },
    },
  );

  const rejected = applyRosterChange(
    { rosterStatus: "ACTIVE" },
    { intent: "reactivate" },
    "2026-10-13",
  );
  assert.equal(rejected.ok, false);
});

test("players are grouped in club category order with active players first", () => {
  const groups = groupPlayersByCategory(categories, [
    {
      id: "b",
      displayName: "Zeta",
      categoryCode: "PS",
      rosterStatus: "INACTIVE",
    },
    {
      id: "a",
      displayName: "alfa",
      categoryCode: "PS",
      rosterStatus: "ACTIVE",
    },
    {
      id: "c",
      displayName: "Nueve",
      categoryCode: "9na",
      rosterStatus: "ACTIVE",
    },
  ]);

  assert.deepEqual(
    groups.map((group) => ({
      code: group.category.code,
      names: group.players.map((player) => player.displayName),
    })),
    [
      { code: "PS", names: ["alfa", "Zeta"] },
      { code: "9na", names: ["Nueve"] },
      { code: "Esc", names: [] },
    ],
  );
});

test("club dates use the Argentina calendar", () => {
  assert.equal(clubDate(new Date("2026-10-13T02:30:00.000Z")), "2026-10-12");
  assert.equal(clubDate(new Date("2026-10-13T03:30:00.000Z")), "2026-10-13");
  assert.equal(formatRosterDate(new Date("2026-09-01T00:00:00.000Z")), "2026-09-01");
});
