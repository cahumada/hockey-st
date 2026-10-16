import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultCategoryCollaboratorId,
  formatThirdTimeMonth,
  parseThirdTimeListQuery,
  thirdTimeChargedOnBounds,
  thirdTimeListSearchParams,
  thirdTimeOverview,
  thirdTimePageCount,
  planCategoryFeeBatch,
  thirdTimeChargedMonth,
  thirdTimeSummary,
  validateThirdTimeFormValues,
} from "./third-time.ts";

const catalogs = {
  players: [
    { id: "player-1", categoryCode: "9na" },
    { id: "player-2", categoryCode: "PS" },
  ],
  collaboratorIds: ["col-1"],
  channelNames: ["Mercado Pago"],
};

test("accepts a paid fee and copies the player category", () => {
  const parsed = validateThirdTimeFormValues(
    {
      playerId: "player-1",
      chargedOn: "2026-02-18",
      paidOn: "2026-02-11",
      amount: "20.000,00",
      channel: " Mercado Pago ",
      status: "PAID",
      controllerId: "col-1",
      receiptReference: " 145831530308 ",
      notes: "  ",
    },
    catalogs,
  );

  assert.deepEqual(parsed, {
    ok: true,
    value: {
      playerId: "player-1",
      categoryCode: "9na",
      chargedOn: "2026-02-01",
      paidOn: "2026-02-11",
      amount: "20000.00",
      channel: "Mercado Pago",
      status: "PAID",
      controllerId: "col-1",
      receiptReference: "145831530308",
      notes: null,
    },
  });
});

test("allows an empty amount and payment date for a pending fee", () => {
  const parsed = validateThirdTimeFormValues(
    {
      playerId: "player-2",
      chargedOn: "2026-10",
      paidOn: "",
      amount: "",
      channel: "",
      status: "PENDING",
      controllerId: "col-1",
      receiptReference: "",
      notes: "Consultar Anabella",
    },
    catalogs,
  );

  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.chargedOn, "2026-10-01");
  assert.equal(formatThirdTimeMonth("2026-10-03"), "Octubre 2026");
  assert.equal(parsed.value.amount, null);
  assert.equal(parsed.value.paidOn, null);
  assert.equal(parsed.value.channel, null);
  assert.equal(parsed.value.categoryCode, "PS");
  assert.equal(parsed.value.notes, "Consultar Anabella");
});

test("rejects an impossible date, an unknown player, and a negative amount", () => {
  const parsed = validateThirdTimeFormValues(
    {
      playerId: "missing",
      chargedOn: "2026-02-31",
      paidOn: "ayer",
      amount: "-1",
      channel: "Otro",
      status: "Baja",
      controllerId: "missing",
      receiptReference: "",
      notes: "",
    },
    catalogs,
  );

  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.equal(parsed.errors.playerId, "Elegí una jugadora.");
  assert.equal(parsed.errors.chargedOn, "Elegí un mes.");
  assert.equal(parsed.errors.paidOn, "Ingresá una fecha válida.");
  assert.equal(parsed.errors.channel, "Elegí un canal.");
  assert.equal(parsed.errors.amount, "El importe no es válido.");
  assert.equal(parsed.errors.status, "Elegí un estado.");
  assert.equal(parsed.errors.controllerId, "Elegí un colaborador.");
});

test("an empty query uses the current club month and year", () => {
  const now = new Date("2026-10-15T15:00:00.000Z");
  const parsed = parseThirdTimeListQuery({}, now);

  assert.equal(parsed.explicitPeriod, false);
  assert.deepEqual(parsed.query.years, [2026]);
  assert.deepEqual(parsed.query.months, [10]);
  assert.deepEqual(parsed.query.statuses, []);
  assert.equal(parsed.query.page, 1);
  assert.equal(thirdTimeListSearchParams(parsed.query), "year=2026&month=10");
});

test("query filters keep several statuses, categories, channels, controllers, search, and page", () => {
  const parsed = parseThirdTimeListQuery({
    q: "  Fabiana ",
    status: ["pending", "paid"],
    year: "all",
    month: ["10", "2"],
    category: ["9na", "PS"],
    channel: "Mercado Pago",
    controller: ["col-1", "col-2"],
    page: "2",
  });

  assert.equal(parsed.explicitPeriod, true);
  assert.equal(parsed.query.text, "Fabiana");
  assert.deepEqual(parsed.query.statuses, ["paid", "pending"]);
  assert.deepEqual(parsed.query.years, []);
  assert.deepEqual(parsed.query.months, [2, 10]);
  assert.deepEqual(parsed.query.categoryCodes, ["9na", "PS"]);
  assert.deepEqual(parsed.query.channels, ["Mercado Pago"]);
  assert.deepEqual(parsed.query.controllerIds, ["col-1", "col-2"]);
  assert.equal(parsed.query.page, 2);
  assert.equal(
    thirdTimeListSearchParams(parsed.query),
    "q=Fabiana&status=paid&status=pending&year=all&month=2&month=10&category=9na&category=PS&channel=Mercado+Pago&controller=col-1&controller=col-2&page=2",
  );
  assert.equal(thirdTimePageCount(21), 2);
  assert.equal(thirdTimePageCount(0), 1);
});

test("a single legacy filter value still parses", () => {
  const parsed = parseThirdTimeListQuery({
    status: "pending",
    year: "2025,2026",
    month: "2",
    category: "9na",
  });

  assert.deepEqual(parsed.query.statuses, ["pending"]);
  assert.deepEqual(parsed.query.years, [2026, 2025]);
  assert.deepEqual(parsed.query.months, [2]);
  assert.deepEqual(parsed.query.categoryCodes, ["9na"]);
});

test("several months and years bound the charged-on range", () => {
  assert.deepEqual(thirdTimeChargedOnBounds({ years: [2026], months: [10] }, []), [
    { gte: "2026-10-01", lt: "2026-11-01" },
  ]);
  assert.deepEqual(thirdTimeChargedOnBounds({ years: [2026, 2025], months: [1, 12] }, []), [
    { gte: "2026-01-01", lt: "2026-02-01" },
    { gte: "2026-12-01", lt: "2027-01-01" },
    { gte: "2025-01-01", lt: "2025-02-01" },
    { gte: "2025-12-01", lt: "2026-01-01" },
  ]);
  assert.deepEqual(thirdTimeChargedOnBounds({ years: [2026], months: [] }, []), [
    { gte: "2026-01-01", lt: "2027-01-01" },
  ]);
  assert.deepEqual(thirdTimeChargedOnBounds({ years: [], months: [2] }, [2026, 2025]), [
    { gte: "2025-02-01", lt: "2025-03-01" },
    { gte: "2026-02-01", lt: "2026-03-01" },
  ]);
  assert.equal(thirdTimeChargedOnBounds({ years: [], months: [] }, []), null);
});

test("overview sums nullable amounts and compares this month with the previous one", () => {
  const now = new Date("2026-10-15T15:00:00.000Z");
  const cards = thirdTimeOverview(
    [
      { chargedOn: "2026-10-02", amount: "100.00" },
      { chargedOn: "2026-10-03", amount: null },
      { chargedOn: "2026-09-15", amount: "50.00" },
      { chargedOn: "2026-05-01", amount: "10.00" },
      { chargedOn: "2026-04-01", amount: "1000.00" },
      { chargedOn: "2026-01-10", amount: "20.00" },
    ],
    now,
  );

  assert.deepEqual(
    cards.map((card) => [card.id, card.amount, card.count, card.period]),
    [
      ["current-month", "100.00", 2, "Octubre 2026"],
      ["previous-month", "50.00", 1, "Septiembre 2026"],
      ["six-months", "160.00", 4, "Mayo – octubre 2026"],
      ["current-year", "1180.00", 6, "2026"],
    ],
  );
  assert.equal(defaultCategoryCollaboratorId(
    [
      { id: "inactive", categoryCode: "7ma", active: false },
      { id: "other", categoryCode: "8va", active: true },
      { id: "active", categoryCode: "7ma", active: true },
    ],
    "7ma",
  ), "active");
  assert.equal(defaultCategoryCollaboratorId(
    [{ id: "inactive", categoryCode: "7ma", active: false }],
    "7ma",
  ), null);
  assert.equal(defaultCategoryCollaboratorId(
    [
      { id: "coord", categoryCode: "7ma", active: true, kind: "COORDINATOR" },
      { id: "third", categoryCode: "7ma", active: true, kind: "THIRD_TIME" },
    ],
    "7ma",
  ), "third");
  assert.deepEqual(
    planCategoryFeeBatch(
      {
        categoryCode: "7ma",
        chargedOn: "2026-10-15",
        amount: "15.000,50",
        status: "PENDING",
        controllerId: "col-1",
      },
      {
        categoryCodes: ["7ma"],
        players: [
          { id: "inactive", categoryCode: "7ma", active: false },
          { id: "other", categoryCode: "8va", active: true },
          { id: "ana", categoryCode: "7ma", active: true },
          { id: "luz", categoryCode: "7ma", active: true },
        ],
        collaboratorIds: ["col-1"],
        existingCount: 0,
      },
    ),
    {
      ok: true,
      value: {
        categoryCode: "7ma",
        chargedOn: "2026-10-01",
        amount: "15000.50",
        status: "PENDING",
        controllerId: "col-1",
        playerIds: ["ana", "luz"],
      },
    },
  );
  const blocked = planCategoryFeeBatch(
    {
      categoryCode: "7ma",
      chargedOn: "2026-10",
      amount: "",
      status: "PENDING",
      controllerId: "col-1",
    },
    {
      categoryCodes: ["7ma"],
      players: [{ id: "ana", categoryCode: "7ma", active: true }],
      collaboratorIds: ["col-1"],
      existingCount: 1,
    },
  );
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.message, "Ya hay cuotas cargadas para esa categoría en ese mes.");
  }
  const empty = planCategoryFeeBatch(
    {
      categoryCode: "7ma",
      chargedOn: "2026-10",
      amount: "",
      status: "PENDING",
      controllerId: "col-1",
    },
    {
      categoryCodes: ["7ma"],
      players: [{ id: "inactive", categoryCode: "7ma", active: false }],
      collaboratorIds: ["col-1"],
      existingCount: 0,
    },
  );
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.equal(empty.message, "No hay jugadoras activas en esa categoría.");
  }
  assert.equal(thirdTimeChargedMonth("2026-10-15"), "2026-10-01");
  assert.equal(cards[0]?.change, "up");
  assert.equal(cards[0]?.changeLabel, "Subió 100% frente a septiembre");
  assert.equal(thirdTimeSummary({ count: 1, amount: "100.00" }).includes("cuota"), true);
  assert.equal(thirdTimeSummary({ count: 2, amount: "100.00" }).includes("cuotas"), true);
});
