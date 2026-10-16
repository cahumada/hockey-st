import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLegacyThirdTimeRow } from "./legacy-third-time.ts";
import { resolveLegacyThirdTime } from "./legacy-third-time-import.ts";

const players = [
  { id: "player-1", displayName: "Fabiana, Bravo", categoryCode: "9na" },
  { id: "player-2", displayName: "Fabiana, Bravo", categoryCode: "8va" },
];

const collaborators = [{ id: "col-1", displayName: "Natalia Palladino" }];

function row(overrides: Partial<Parameters<typeof parseLegacyThirdTimeRow>[0]> = {}) {
  return parseLegacyThirdTimeRow({
    legacyRow: 3,
    playerName: "Fabiana, Bravo",
    categoryCode: "9na",
    amount: 20000,
    excelChargedOn: 46054,
    excelPaidOn: 46064,
    receiptText: "145831530308",
    driveUrl: null,
    channel: "Mercado Pago",
    status: "Pagado",
    controllerName: "Natalia Palladino",
    notes: "",
    ...overrides,
  });
}

test("resolves the player by name and category and the controller by name", () => {
  assert.deepEqual(resolveLegacyThirdTime(row(), players, collaborators), {
    ok: true,
    playerId: "player-1",
    controllerId: "col-1",
  });
});

test("uses the workbook roster when the directory renamed the player", () => {
  const resolved = resolveLegacyThirdTime(
    row({ playerName: "Ahumada, Eva", categoryCode: "7ma" }),
    [{ id: "player-eva", displayName: "Eva", categoryCode: "7ma", legacyId: 53 }],
    collaborators,
    [{ legacyId: 53, displayName: "Ahumada, Eva", categoryCode: "7ma" }],
  );

  assert.deepEqual(resolved, { ok: true, playerId: "player-eva", controllerId: "col-1" });
});

test("refuses a player in another category and an unknown controller", () => {
  const wrongCategory = resolveLegacyThirdTime(
    row({ categoryCode: "PS" }),
    players,
    collaborators,
  );
  assert.equal(wrongCategory.ok, false);

  const unknownController = resolveLegacyThirdTime(
    row({ controllerName: "Anabella" }),
    players,
    collaborators,
  );
  assert.equal(unknownController.ok, false);
});
