import assert from "node:assert/strict";
import { test } from "node:test";
import {
  legacyExpenseTypes,
  legacyIncomeTypes,
} from "./legacy-maintenance-catalogs.ts";

test("expense types keep the sheet ids, descriptions, and active status", () => {
  assert.deepEqual(legacyExpenseTypes, [
    { legacyId: 1, description: "Cancha Chicago", status: "ACTIVE" },
    { legacyId: 2, description: "Micros 3er T", status: "ACTIVE" },
    { legacyId: 3, description: "Árbitro 1", status: "ACTIVE" },
    { legacyId: 4, description: "Árbitro 2", status: "ACTIVE" },
    { legacyId: 5, description: "Médico", status: "ACTIVE" },
    { legacyId: 6, description: "Bananas", status: "ACTIVE" },
    { legacyId: 7, description: "Alfajores", status: "ACTIVE" },
    { legacyId: 8, description: "Aguas", status: "ACTIVE" },
    { legacyId: 9, description: "Panchos", status: "ACTIVE" },
    { legacyId: 10, description: "Aderezos", status: "ACTIVE" },
    { legacyId: 11, description: "Ensaladas", status: "ACTIVE" },
    { legacyId: 12, description: "Botiquín", status: "ACTIVE" },
    { legacyId: 13, description: "Sede", status: "ACTIVE" },
    { legacyId: 14, description: "Asociación", status: "ACTIVE" },
    { legacyId: 15, description: "Otros", status: "ACTIVE" },
  ]);

  const expenseIds = legacyExpenseTypes.map((expenseType) => expenseType.legacyId);
  assert.equal(new Set(expenseIds).size, expenseIds.length);
});

test("income types keep the sheet ids, descriptions, and active status", () => {
  assert.deepEqual(legacyIncomeTypes, [
    { legacyId: 1, description: "Tercer Tiempo", status: "ACTIVE" },
    { legacyId: 2, description: "Sponsor", status: "ACTIVE" },
    { legacyId: 3, description: "Donaciones", status: "ACTIVE" },
    { legacyId: 4, description: "Otros", status: "ACTIVE" },
  ]);

  const incomeIds = legacyIncomeTypes.map((incomeType) => incomeType.legacyId);
  assert.equal(new Set(incomeIds).size, incomeIds.length);
});
