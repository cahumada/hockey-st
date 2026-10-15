import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLegacyExpenseRow } from "./legacy-expenses.ts";

const chicagoReceipt =
  "https://drive.google.com/file/d/1odB3lKHi5dvFWVLvKS6-d-GbAMHOimip/view?usp=drive_link";

test("parses the first Gastos row from the 2026 workbook", () => {
  assert.deepEqual(
    parseLegacyExpenseRow({
      legacyRow: 2,
      excelDateSerial: 46082,
      expenseType: "Cancha Chicago",
      unitAmount: 90000,
      quantity: 1,
      collaboratorLabel: "Anabella - Coordinador",
      notes: "tiene fecha 14/2/2026",
      verified: 1,
      driveUrl: chicagoReceipt,
    }),
    {
      legacyRow: 2,
      spentOn: "2026-03-01",
      expenseTypeDescription: "Cancha Chicago",
      unitAmount: "90000.00",
      quantity: "1.00",
      total: "90000.00",
      collaborator: { categoryCode: null, displayName: "Anabella" },
      notes: "tiene fecha 14/2/2026",
      verified: true,
      driveFileId: "1odB3lKHi5dvFWVLvKS6-d-GbAMHOimip",
      monthLabel: "03 - marzo",
      year: 2026,
    },
  );
});

test("maps the Afajores typo onto the catalog name", () => {
  const parsed = parseLegacyExpenseRow({
    legacyRow: 20,
    excelDateSerial: 46087,
    expenseType: "Afajores",
    unitAmount: 83622.75,
    quantity: 1,
    collaboratorLabel: "9na - Natalia Palladino",
    notes: "",
    verified: 0,
    driveUrl: null,
  });

  assert.equal(parsed.expenseTypeDescription, "Alfajores");
  assert.equal(parsed.spentOn, "2026-03-06");
  assert.equal(parsed.total, "83622.75");
  assert.deepEqual(parsed.collaborator, {
    categoryCode: "9na",
    displayName: "Natalia Palladino",
  });
  assert.equal(parsed.notes, null);
  assert.equal(parsed.verified, false);
  assert.equal(parsed.driveFileId, null);
  assert.equal(parsed.monthLabel, "03 - marzo");
});
