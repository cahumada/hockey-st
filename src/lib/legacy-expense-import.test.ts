import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLegacyExpenseRow } from "./legacy-expenses.ts";
import { resolveLegacyExpense } from "./legacy-expense-import.ts";

const expenseTypes = [{ id: "type-alfajores", description: "Alfajores" }];
const collaborators = [
  { id: "person-anabella", displayName: "Anabella", categoryCode: null },
  { id: "person-natalia", displayName: "Natalia Palladino", categoryCode: "9na" },
];

test("resolves the catalog type and the category collaborator", () => {
  const expense = parseLegacyExpenseRow({
    legacyRow: 20,
    excelDateSerial: 46087,
    expenseType: "Afajores",
    unitAmount: 10,
    quantity: 1,
    collaboratorLabel: "9na - Natalia Palladino",
    notes: "",
    verified: 0,
    driveUrl: null,
  });

  assert.deepEqual(resolveLegacyExpense(expense, expenseTypes, collaborators), {
    ok: true,
    expenseTypeId: "type-alfajores",
    collaboratorId: "person-natalia",
  });
});

test("reports a type or collaborator that is not in the directory", () => {
  const expense = parseLegacyExpenseRow({
    legacyRow: 2,
    excelDateSerial: 46082,
    expenseType: "Cancha Chicago",
    unitAmount: 10,
    quantity: 1,
    collaboratorLabel: "Anabella - Coordinador",
    notes: "",
    verified: 1,
    driveUrl: null,
  });

  assert.equal(resolveLegacyExpense(expense, expenseTypes, collaborators).ok, false);
  assert.equal(
    resolveLegacyExpense(expense, [{ id: "type-cancha", description: "Cancha Chicago" }], [
      { id: "other", displayName: "Anabella", categoryCode: "9na" },
    ]).ok,
    false,
  );
});
