import assert from "node:assert/strict";
import { test } from "node:test";
import { planCategoryRateChange } from "./category-third-time-rate.ts";

const today = "2026-10-15";

test("the first category amount starts history with no previous value", () => {
  assert.deepEqual(
    planCategoryRateChange(
      { amount: null },
      { amount: "15.000,50", updatedOn: "2026-10-15", note: "  " },
      today,
    ),
    {
      ok: true,
      value: {
        previousAmount: null,
        amount: "15000.50",
        updatedOn: "2026-10-15",
        note: null,
      },
    },
  );
});

test("a later adjustment keeps the previous amount and the note", () => {
  assert.deepEqual(
    planCategoryRateChange(
      { amount: "15000.50" },
      { amount: "18000", updatedOn: "2026-10-01", note: " Inflación " },
      today,
    ),
    {
      ok: true,
      value: {
        previousAmount: "15000.50",
        amount: "18000.00",
        updatedOn: "2026-10-01",
        note: "Inflación",
      },
    },
  );
});

test("an unchanged amount does not open a history row", () => {
  const result = planCategoryRateChange(
    { amount: "15000.50" },
    { amount: "15.000,50", updatedOn: today, note: "" },
    today,
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errors.amount, "El importe no cambió.");
  }
});

test("the amount, the date, and a long note are rejected", () => {
  const result = planCategoryRateChange(
    { amount: null },
    { amount: "no", updatedOn: "2026-13-40", note: "x".repeat(201) },
    today,
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errors.amount, "El importe no es válido.");
    assert.equal(result.errors.updatedOn, "Elegí una fecha.");
    assert.equal(result.errors.note, "Usá 200 caracteres o menos.");
  }
});

test("a missing amount and a future date are rejected", () => {
  const result = planCategoryRateChange(
    { amount: null },
    { amount: "   ", updatedOn: "2026-10-16", note: "" },
    today,
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.errors.amount, "Ingresá el importe.");
    assert.equal(result.errors.updatedOn, "La fecha no puede ser posterior a hoy.");
  }
});
