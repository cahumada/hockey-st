import assert from "node:assert/strict";
import { test } from "node:test";
import { clubDate } from "./roster.ts";
import { defaultThirdTimePeriod } from "./third-time.ts";
import {
  adjustThirdTimeReportColumnWidth,
  buildThirdTimeCategoryReport,
  defaultThirdTimeReportColumnWidths,
  parseThirdTimeReportQuery,
  thirdTimeCollectionComparison,
  thirdTimeReportColumnMinimum,
  thirdTimeReportFittedWidths,
  thirdTimeReportMonthLabels,
  thirdTimeStatusShares,
} from "./third-time-report.ts";

const clubYearBoundary = new Date("2026-01-01T02:30:00.000Z");

test("month labels cover January through December in Spanish", () => {
  assert.deepEqual(
    thirdTimeReportMonthLabels.map((month) => month.abbreviation),
    ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
  );
  assert.deepEqual(
    thirdTimeReportMonthLabels.map((month) => month.fullName),
    [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ],
  );
});

test("missing and invalid year fall back to the club year of a fixed date", () => {
  const clubYear = Number(clubDate(clubYearBoundary).slice(0, 4));
  assert.equal(clubYear, 2025);

  for (const params of [{}, { year: "nope" }, { year: "1999" }, { year: "2101" }, { year: "2026.5" }]) {
    assert.equal(parseThirdTimeReportQuery(params, clubYearBoundary).year, clubYear);
  }
});

test("a valid year is kept", () => {
  assert.equal(parseThirdTimeReportQuery({ year: "2024" }, clubYearBoundary).year, 2024);
  assert.equal(parseThirdTimeReportQuery({ year: "2000" }, clubYearBoundary).year, 2000);
  assert.equal(parseThirdTimeReportQuery({ year: "2100" }, clubYearBoundary).year, 2100);
});

test("empty, blank, and array category params", () => {
  assert.equal(parseThirdTimeReportQuery({}).categoryCode, null);
  assert.equal(parseThirdTimeReportQuery({ category: "" }).categoryCode, null);
  assert.equal(parseThirdTimeReportQuery({ category: "   " }).categoryCode, null);
  assert.equal(parseThirdTimeReportQuery({ category: ["", "  9na  "] }).categoryCode, "9na");
  assert.equal(parseThirdTimeReportQuery({ category: " PS " }).categoryCode, "PS");
});

test("a paid fee lands in March with its amount", () => {
  const report = buildThirdTimeCategoryReport({
    year: 2026,
    categoryCode: "9na",
    players: [{ id: "ana", displayName: "Ana", categoryCode: "9na" }],
    fees: [
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-03-01",
        amount: "1500.00",
        status: "PAID",
        deleted: false,
      },
    ],
  });

  assert.equal(report.rows[0].cells[2].status, "PAID");
  assert.equal(report.rows[0].cells[2].amount, "1500.00");
  assert.equal(report.rows[0].cells[2].feeCount, 1);
  assert.equal(report.rows[0].cells[0].status, "EMPTY");
  assert.equal(report.rows[0].cells[0].amount, null);
  assert.equal(report.rows[0].cells[0].feeCount, 0);
});

test("a pending fee with a null amount stays null and pending", () => {
  const report = buildThirdTimeCategoryReport({
    year: 2026,
    categoryCode: "9na",
    players: [{ id: "ana", displayName: "Ana", categoryCode: "9na" }],
    fees: [
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-04-15",
        amount: null,
        status: "PENDING",
        deleted: false,
      },
    ],
  });

  assert.deepEqual(report.rows[0].cells[3], { status: "PENDING", amount: null, feeCount: 1 });
});

test("an exempt fee keeps its amount", () => {
  const report = buildThirdTimeCategoryReport({
    year: 2026,
    categoryCode: "9na",
    players: [{ id: "ana", displayName: "Ana", categoryCode: "9na" }],
    fees: [
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-05-01",
        amount: "500.00",
        status: "EXEMPT",
        deleted: false,
      },
    ],
  });

  assert.deepEqual(report.rows[0].cells[4], { status: "EXEMPT", amount: "500.00", feeCount: 1 });
});

test("two fees in one month with different statuses become mixed and the amounts sum", () => {
  const report = buildThirdTimeCategoryReport({
    year: 2026,
    categoryCode: "9na",
    players: [{ id: "ana", displayName: "Ana", categoryCode: "9na" }],
    fees: [
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-06-01",
        amount: "10.00",
        status: "PAID",
        deleted: false,
      },
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-06-20",
        amount: "5.50",
        status: "PENDING",
        deleted: false,
      },
    ],
  });

  assert.deepEqual(report.rows[0].cells[5], { status: "MIXED", amount: "15.50", feeCount: 2 });
});

test("two fees with the same status sum and keep that status", () => {
  const report = buildThirdTimeCategoryReport({
    year: 2026,
    categoryCode: "9na",
    players: [{ id: "ana", displayName: "Ana", categoryCode: "9na" }],
    fees: [
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-06-01",
        amount: "20.00",
        status: "PAID",
        deleted: false,
      },
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-06-18",
        amount: "3.25",
        status: "PAID",
        deleted: false,
      },
    ],
  });

  assert.deepEqual(report.rows[0].cells[5], { status: "PAID", amount: "23.25", feeCount: 2 });
});

test("deleted, other-category, other-year, and unknown-player fees are excluded", () => {
  const report = buildThirdTimeCategoryReport({
    year: 2026,
    categoryCode: "9na",
    players: [{ id: "ana", displayName: "Ana", categoryCode: "9na" }],
    fees: [
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-03-01",
        amount: "10.00",
        status: "PAID",
        deleted: false,
      },
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-03-02",
        amount: "999.00",
        status: "PAID",
        deleted: true,
      },
      {
        playerId: "ana",
        categoryCode: "PS",
        chargedOn: "2026-03-03",
        amount: "888.00",
        status: "PAID",
        deleted: false,
      },
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2025-03-01",
        amount: "777.00",
        status: "PAID",
        deleted: false,
      },
      {
        playerId: "ghost",
        categoryCode: "9na",
        chargedOn: "2026-03-04",
        amount: "666.00",
        status: "PAID",
        deleted: false,
      },
    ],
  });

  assert.deepEqual(report.rows[0].cells[2], { status: "PAID", amount: "10.00", feeCount: 1 });
  assert.equal(report.grandTotal, "10.00");
});

test("a player in another category is excluded", () => {
  const report = buildThirdTimeCategoryReport({
    year: 2026,
    categoryCode: "9na",
    players: [
      { id: "ana", displayName: "Ana", categoryCode: "9na" },
      { id: "bea", displayName: "Beatriz", categoryCode: "PS" },
    ],
    fees: [
      {
        playerId: "bea",
        categoryCode: "PS",
        chargedOn: "2026-03-01",
        amount: "555.00",
        status: "PAID",
        deleted: false,
      },
    ],
  });

  assert.deepEqual(
    report.rows.map((row) => row.playerId),
    ["ana"],
  );
  assert.equal(report.grandTotal, "0.00");
});

test("row, column, and grand totals ignore null amounts", () => {
  const report = buildThirdTimeCategoryReport({
    year: 2026,
    categoryCode: "9na",
    players: [
      { id: "ana", displayName: "Ana", categoryCode: "9na" },
      { id: "luz", displayName: "Luz", categoryCode: "9na" },
    ],
    fees: [
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-03-01",
        amount: "10.00",
        status: "PAID",
        deleted: false,
      },
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-04-01",
        amount: null,
        status: "PENDING",
        deleted: false,
      },
      {
        playerId: "luz",
        categoryCode: "9na",
        chargedOn: "2026-03-01",
        amount: null,
        status: "PENDING",
        deleted: false,
      },
      {
        playerId: "luz",
        categoryCode: "9na",
        chargedOn: "2026-04-01",
        amount: "2.50",
        status: "PAID",
        deleted: false,
      },
    ],
  });

  assert.equal(report.rows[0].total, "10.00");
  assert.equal(report.rows[1].total, "2.50");
  assert.equal(report.rows[0].cells[3].amount, null);
  assert.equal(report.columnTotals[2], "10.00");
  assert.equal(report.columnTotals[3], "2.50");
  assert.equal(report.columnTotals[0], "0.00");
  assert.equal(report.columnTotals.length, 12);
  assert.ok(report.columnTotals.every((total) => total !== null));
  assert.equal(report.grandTotal, "12.50");
  assert.equal(report.months, thirdTimeReportMonthLabels);
});

test("players sort by displayName in Spanish locale", () => {
  const report = buildThirdTimeCategoryReport({
    year: 2026,
    categoryCode: "9na",
    players: [
      { id: "zoe", displayName: "Zoe", categoryCode: "9na" },
      { id: "nandu", displayName: "Ñandú", categoryCode: "9na" },
      { id: "ana", displayName: "Ana", categoryCode: "9na" },
    ],
    fees: [],
  });

  assert.deepEqual(
    report.rows.map((row) => row.displayName),
    ["Ana", "Ñandú", "Zoe"],
  );
});

test("default column widths cover the player, twelve months, and the total", () => {
  const widths = defaultThirdTimeReportColumnWidths();

  assert.equal(widths.length, 14);
  assert.ok(widths[0] > widths[1]);
  assert.ok(widths.every((width, index) => width >= thirdTimeReportColumnMinimum(index)));
});

test("a column grows, shrinks, and stops at its minimum", () => {
  assert.equal(adjustThirdTimeReportColumnWidth(88, 12, 56), 100);
  assert.equal(adjustThirdTimeReportColumnWidth(88, -20, 56), 68);
  assert.equal(adjustThirdTimeReportColumnWidth(88, -100, 56), 56);
  assert.equal(adjustThirdTimeReportColumnWidth(88, Number.NaN, 56), 88);
});

test("the player and total columns keep a wider minimum than a month", () => {
  assert.equal(thirdTimeReportColumnMinimum(0), 96);
  assert.equal(thirdTimeReportColumnMinimum(3), 56);
  assert.equal(thirdTimeReportColumnMinimum(13), 80);
});

test("the player column fits the longest name and the avatar", () => {
  const widths = thirdTimeReportFittedWidths({
    headerWidth: 40,
    nameWidths: [20, 180],
    monthWidths: Array.from({ length: 12 }, () => 10),
    totalHeaderWidth: 30,
    totalWidths: [40],
  });

  assert.equal(widths[0], 244);
});

test("the total column and the footer month fit their amounts", () => {
  const monthWidths = Array.from({ length: 12 }, () => 10);
  monthWidths[2] = 140;
  const widths = thirdTimeReportFittedWidths({
    headerWidth: 10,
    nameWidths: [10],
    monthWidths,
    totalHeaderWidth: 20,
    totalWidths: [40, 200],
  });

  assert.equal(widths[3], 156);
  assert.equal(widths[13], 224);
});

test("fitted columns stay at the minimum when the text is short", () => {
  const widths = thirdTimeReportFittedWidths({
    headerWidth: 0,
    nameWidths: [],
    monthWidths: [],
    totalHeaderWidth: 0,
    totalWidths: [],
  });

  assert.ok(widths.every((width, index) => width >= thirdTimeReportColumnMinimum(index)));
  assert.equal(widths[0], thirdTimeReportColumnMinimum(0));
  assert.equal(widths[13], thirdTimeReportColumnMinimum(13));
});

test("a missing or invalid month falls back to the club month", () => {
  const clubMonth = defaultThirdTimePeriod(clubYearBoundary).month;

  for (const params of [{}, { month: "0" }, { month: "13" }, { month: "nope" }, { month: "3.5" }]) {
    assert.equal(parseThirdTimeReportQuery(params, clubYearBoundary).month, clubMonth);
  }
});

test("a valid month is kept", () => {
  assert.equal(parseThirdTimeReportQuery({ month: "3" }, clubYearBoundary).month, 3);
  assert.equal(parseThirdTimeReportQuery({ month: ["12"] }, clubYearBoundary).month, 12);
});

test("status shares use the three fee statuses and round to 100", () => {
  assert.deepEqual(thirdTimeStatusShares([]), {
    total: 0,
    shares: [
      { status: "PAID", count: 0, percent: 0 },
      { status: "PENDING", count: 0, percent: 0 },
      { status: "EXEMPT", count: 0, percent: 0 },
    ],
  });

  const exact = thirdTimeStatusShares([
    ...Array.from({ length: 16 }, () => ({ status: "PAID" as const })),
    ...Array.from({ length: 3 }, () => ({ status: "PENDING" as const })),
    { status: "EXEMPT" },
  ]);
  assert.equal(exact.total, 20);
  assert.deepEqual(
    exact.shares.map((share) => share.percent),
    [80, 15, 5],
  );

  const split = thirdTimeStatusShares([{ status: "PAID" }, { status: "PENDING" }, { status: "EXEMPT" }]);
  assert.deepEqual(
    split.shares.map((share) => share.percent),
    [34, 33, 33],
  );
  assert.equal(
    split.shares.reduce((sum, share) => sum + share.percent, 0),
    100,
  );
});

test("different statuses in one month stay separate shares", () => {
  const report = buildThirdTimeCategoryReport({
    year: 2026,
    categoryCode: "9na",
    players: [{ id: "ana", displayName: "Ana", categoryCode: "9na" }],
    fees: [
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-03-01",
        amount: "10.00",
        status: "PAID",
        deleted: false,
      },
      {
        playerId: "ana",
        categoryCode: "9na",
        chargedOn: "2026-03-15",
        amount: "5.00",
        status: "PENDING",
        deleted: false,
      },
    ],
  });

  assert.equal(report.rows[0].cells[2].status, "MIXED");
  assert.deepEqual(
    report.statusMix[2].shares.map((share) => share.count),
    [1, 1, 0],
  );
  assert.equal(report.collectedByMonth[2], "10.00");
  assert.equal(report.collectedByMonth[0], "0.00");
});

test("expected amount is the category rate times the player count", () => {
  const comparison = thirdTimeCollectionComparison({
    playerCount: 4,
    categoryAmount: "1500.00",
    collected: "3000.00",
  });

  assert.equal(comparison.expected, "6000.00");
  assert.equal(comparison.collected, "3000.00");
  assert.equal(comparison.difference, "-3000.00");
});

test("a category without an amount has no expected total", () => {
  const comparison = thirdTimeCollectionComparison({
    playerCount: 4,
    categoryAmount: null,
    collected: "10.50",
  });

  assert.equal(comparison.expected, null);
  assert.equal(comparison.collected, "10.50");
  assert.equal(comparison.difference, null);
});

test("a fractional category rate multiplies in cents", () => {
  assert.equal(
    thirdTimeCollectionComparison({
      playerCount: 3,
      categoryAmount: "10.50",
      collected: "0.00",
    }).expected,
    "31.50",
  );
});
