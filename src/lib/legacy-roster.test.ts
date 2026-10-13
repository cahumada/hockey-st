import assert from "node:assert/strict";
import { test } from "node:test";
import {
  legacyCategories,
  legacyPlayers,
  rosterDateFromExcelSerial,
} from "./legacy-roster.ts";

test("excel roster dates use the spreadsheet 1900 date system", () => {
  assert.equal(rosterDateFromExcelSerial(46266), "2026-09-01");
});

test("category catalog matches the Categorias sheet", () => {
  assert.deepEqual(
    legacyCategories.map((category) => [category.code, category.description, category.active]),
    [
      ["PS", "Primera", true],
      ["5ta", "Quinta", true],
      ["6ta", "Sexta", true],
      ["7ma", "Septima", true],
      ["8va", "Octava", true],
      ["9na", "Novena", true],
      ["10ma", "Decima", true],
      ["Esc", "Escuelita", true],
    ],
  );
});

test("jugadoras load keeps the sheet name, category, and status", () => {
  assert.equal(legacyPlayers.length, 91);
  assert.deepEqual(
    legacyPlayers.map((player) => player.legacyId),
    Array.from({ length: 91 }, (_, index) => index + 1),
  );

  const codes = new Set(legacyCategories.map((category) => category.code));
  const counts = new Map<string, number>();
  for (const player of legacyPlayers) {
    assert.ok(player.displayName.trim().length > 0);
    assert.equal(player.displayName, player.displayName.trim());
    assert.ok(codes.has(player.categoryCode));
    counts.set(player.categoryCode, (counts.get(player.categoryCode) ?? 0) + 1);
    assert.equal(player.statusReason, null);
  }

  assert.deepEqual(Object.fromEntries(counts), {
    PS: 26,
    "5ta": 10,
    "6ta": 15,
    "7ma": 17,
    "8va": 9,
    "9na": 14,
  });

  const byId = new Map(legacyPlayers.map((player) => [player.legacyId, player]));
  assert.deepEqual(byId.get(1), {
    legacyId: 1,
    displayName: "Cami Gantus",
    categoryCode: "PS",
    rosterStatus: "ACTIVE",
    statusReason: null,
    statusChangedOn: null,
  });
  assert.equal(byId.get(27)?.displayName, "Aguirre Aldana Maricela");
  assert.equal(byId.get(52)?.displayName, "Aguirre, Gianella");
  assert.equal(byId.get(78)?.displayName, "Fabiana, Bravo");

  const inactive = legacyPlayers.filter((player) => player.rosterStatus === "INACTIVE");
  assert.deepEqual(inactive, [
    {
      legacyId: 60,
      displayName: "Gonzalez, Isabella",
      categoryCode: "7ma",
      rosterStatus: "INACTIVE",
      statusReason: null,
      statusChangedOn: "2026-09-01",
    },
  ]);
});
