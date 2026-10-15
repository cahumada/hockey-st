import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultExpensePeriod,
  expenseListSearchParams,
  expenseOverview,
  expensePageCount,
  expenseSpentOnBounds,
  parseExpenseListQuery,
  receiptEmbedKind,
  sumExpenseAmounts,
  verifiedFromReceipt,
  validateExpenseFormValues,
  validateReceiptFile,
  maxReceiptBytes,
} from "./expenses.ts";

const catalogs = {
  expenseTypeIds: ["type-1"],
  collaboratorIds: ["col-1"],
};

test("parses an Argentine amount and computes the total", () => {
  const result = validateExpenseFormValues(
    {
      spentOn: "2026-03-01",
      expenseTypeId: "type-1",
      unitAmount: "90.000,50",
      quantity: "2",
      collaboratorId: "col-1",
      notes: "  cancha  ",
    },
    catalogs,
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.spentOn, "2026-03-01");
  assert.equal(result.value.unitAmount, "90000.50");
  assert.equal(result.value.quantity, "2.00");
  assert.equal(result.value.total, "180001.00");
  assert.equal(result.value.notes, "cancha");
});

test("rejects an impossible date, an unknown type, and a zero quantity", () => {
  const result = validateExpenseFormValues(
    {
      spentOn: "2026-13-01",
      expenseTypeId: "",
      unitAmount: "0",
      quantity: "0",
      collaboratorId: "missing",
      notes: "",
    },
    catalogs,
  );

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errors.spentOn, "Ingresá una fecha válida.");
  assert.equal(result.errors.expenseTypeId, "Elegí un tipo de gasto.");
  assert.equal(result.errors.unitAmount, "El importe tiene que ser mayor a cero.");
  assert.equal(result.errors.quantity, "La cantidad tiene que ser mayor a cero.");
  assert.equal(result.errors.collaboratorId, "Elegí un colaborador.");
});

test("an empty query uses the current club month and year", () => {
  const now = new Date("2026-10-15T15:00:00.000Z");
  const parsed = parseExpenseListQuery({}, now);

  assert.equal(parsed.explicitPeriod, false);
  assert.deepEqual(defaultExpensePeriod(now), { year: 2026, month: 10 });
  assert.equal(parsed.query.year, 2026);
  assert.equal(parsed.query.month, 10);
  assert.equal(parsed.query.status, "all");
  assert.equal(parsed.query.page, 1);
  assert.equal(
    expenseListSearchParams(parsed.query),
    "year=2026&month=10",
  );
});

test("query filters keep status, type, collaborator, search, and page", () => {
  const parsed = parseExpenseListQuery({
    q: "  cancha ",
    status: "pending",
    year: "all",
    month: "3",
    type: "type-1",
    collaborator: "col-1",
    page: "2",
  });

  assert.equal(parsed.explicitPeriod, true);
  assert.equal(parsed.query.text, "cancha");
  assert.equal(parsed.query.status, "pending");
  assert.equal(parsed.query.year, null);
  assert.equal(parsed.query.month, 3);
  assert.equal(parsed.query.expenseTypeId, "type-1");
  assert.equal(parsed.query.collaboratorId, "col-1");
  assert.equal(parsed.query.page, 2);
  assert.equal(expensePageCount(21), 2);
  assert.equal(expensePageCount(0), 1);
});

test("a month and year bound the spent-on range", () => {
  assert.deepEqual(expenseSpentOnBounds({ year: 2026, month: 10 }, []), [
    { gte: "2026-10-01", lt: "2026-11-01" },
  ]);
  assert.deepEqual(expenseSpentOnBounds({ year: 2026, month: null }, []), [
    { gte: "2026-01-01", lt: "2027-01-01" },
  ]);
  assert.deepEqual(expenseSpentOnBounds({ year: null, month: 3 }, [2025, 2026]), [
    { gte: "2025-03-01", lt: "2025-04-01" },
    { gte: "2026-03-01", lt: "2026-04-01" },
  ]);
  assert.equal(expenseSpentOnBounds({ year: null, month: null }, []), null);
  assert.equal(sumExpenseAmounts([{ unitAmount: "100.00", quantity: "2.00" }]), "200.00");
});

test("overview compares this month with the previous one and the longer horizons", () => {
  const now = new Date("2026-10-15T15:00:00.000Z");
  const cards = expenseOverview(
    [
      { spentOn: "2026-10-02", unitAmount: "100.00", quantity: "1.00" },
      { spentOn: "2026-09-15", unitAmount: "50.00", quantity: "1.00" },
      { spentOn: "2026-05-01", unitAmount: "10.00", quantity: "1.00" },
      { spentOn: "2026-04-01", unitAmount: "1000.00", quantity: "1.00" },
      { spentOn: "2026-01-10", unitAmount: "20.00", quantity: "1.00" },
    ],
    now,
  );

  assert.deepEqual(
    cards.map((card) => [card.id, card.amount, card.count, card.period]),
    [
      ["current-month", "100.00", 1, "Octubre 2026"],
      ["previous-month", "50.00", 1, "Septiembre 2026"],
      ["six-months", "160.00", 3, "Mayo – octubre 2026"],
      ["current-year", "1180.00", 5, "2026"],
    ],
  );
  assert.equal(cards[0]?.change, "up");
  assert.equal(cards[0]?.changeLabel, "Subió 100% frente a septiembre");
  assert.equal(cards[3]?.share, 100);
  assert.equal(cards[2]?.listPeriod, null);
  assert.deepEqual(cards[3]?.listPeriod, { year: 2026, month: null });
});

test("a receipt marks the expense verified and a missing receipt leaves it pending", () => {
  assert.equal(verifiedFromReceipt(true), true);
  assert.equal(verifiedFromReceipt(false), false);
});

test("embeds an image receipt and keeps a pdf as a document", () => {
  assert.equal(receiptEmbedKind("image/jpeg"), "image");
  assert.equal(receiptEmbedKind("image/png"), "image");
  assert.equal(receiptEmbedKind("image/webp"), "image");
  assert.equal(receiptEmbedKind("application/pdf"), "document");
  assert.equal(receiptEmbedKind(null), "document");
});

test("accepts a pdf receipt up to the size limit and rejects other files", () => {
  assert.deepEqual(validateReceiptFile({ type: "application/pdf", size: maxReceiptBytes }), {
    ok: true,
  });
  assert.equal(
    validateReceiptFile({ type: "image/jpeg", size: maxReceiptBytes + 1 }).ok,
    false,
  );
  assert.equal(validateReceiptFile({ type: "text/plain", size: 100 }).ok, false);
});
