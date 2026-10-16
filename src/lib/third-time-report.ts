import { clubDate } from "./roster.ts";
import { defaultThirdTimePeriod, sumThirdTimeAmounts } from "./third-time.ts";

export const thirdTimeReportMonthLabels = [
  { abbreviation: "Ene", fullName: "Enero" },
  { abbreviation: "Feb", fullName: "Febrero" },
  { abbreviation: "Mar", fullName: "Marzo" },
  { abbreviation: "Abr", fullName: "Abril" },
  { abbreviation: "May", fullName: "Mayo" },
  { abbreviation: "Jun", fullName: "Junio" },
  { abbreviation: "Jul", fullName: "Julio" },
  { abbreviation: "Ago", fullName: "Agosto" },
  { abbreviation: "Sep", fullName: "Septiembre" },
  { abbreviation: "Oct", fullName: "Octubre" },
  { abbreviation: "Nov", fullName: "Noviembre" },
  { abbreviation: "Dic", fullName: "Diciembre" },
] as const;

export type ThirdTimeReportMonthLabel = (typeof thirdTimeReportMonthLabels)[number];

export type ThirdTimeReportCellStatus = "PAID" | "PENDING" | "EXEMPT" | "MIXED" | "EMPTY";

export type ThirdTimeReportCell = {
  status: ThirdTimeReportCellStatus;
  amount: string | null;
  feeCount: number;
};

export type ThirdTimeReportPlayer = {
  id: string;
  displayName: string;
  categoryCode: string;
  portraitSrc?: string;
};

export type ThirdTimeReportFeeStatus = "PAID" | "PENDING" | "EXEMPT";

export type ThirdTimeReportFee = {
  playerId: string;
  categoryCode: string;
  chargedOn: string;
  amount: string | null;
  status: ThirdTimeReportFeeStatus;
  deleted: boolean;
};

export type ThirdTimeStatusShare = {
  status: ThirdTimeReportFeeStatus;
  count: number;
  percent: number;
};

export type ThirdTimeMonthStatusMix = {
  total: number;
  shares: ThirdTimeStatusShare[];
};

export type ThirdTimeCollectionComparison = {
  expected: string | null;
  collected: string;
  difference: string | null;
};

export type ThirdTimeCategoryReport = {
  year: number;
  categoryCode: string | null;
  months: readonly ThirdTimeReportMonthLabel[];
  rows: {
    playerId: string;
    displayName: string;
    portraitSrc: string;
    cells: ThirdTimeReportCell[];
    total: string;
  }[];
  columnTotals: string[];
  grandTotal: string;
  statusMix: ThirdTimeMonthStatusMix[];
  collectedByMonth: string[];
};

function emptyCell(): ThirdTimeReportCell {
  return { status: "EMPTY", amount: null, feeCount: 0 };
}

export function parseThirdTimeReportQuery(
  params: Record<string, string | string[] | undefined>,
  now = new Date(),
): { year: number; month: number; categoryCode: string | null } {
  return {
    year: yearFromParam(params.year, now),
    month: monthFromParam(params.month, now),
    categoryCode: categoryFromParam(params.category),
  };
}

const statusOrder: readonly ThirdTimeReportFeeStatus[] = ["PAID", "PENDING", "EXEMPT"];

export function thirdTimeStatusShares(
  fees: readonly { status: ThirdTimeReportFeeStatus }[],
): ThirdTimeMonthStatusMix {
  const counts = new Map<ThirdTimeReportFeeStatus, number>(statusOrder.map((status) => [status, 0]));
  for (const fee of fees) counts.set(fee.status, (counts.get(fee.status) ?? 0) + 1);
  const ordered = statusOrder.map((status) => counts.get(status) ?? 0);
  const percents = roundedPercents(ordered);
  return {
    total: ordered.reduce((sum, count) => sum + count, 0),
    shares: statusOrder.map((status, index) => ({
      status,
      count: ordered[index],
      percent: percents[index],
    })),
  };
}

export function thirdTimeCollectionComparison({
  playerCount,
  categoryAmount,
  collected,
}: {
  playerCount: number;
  categoryAmount: string | null;
  collected: string;
}): ThirdTimeCollectionComparison {
  const rate = categoryAmount === null ? null : moneyCents(categoryAmount);
  const expected = rate === null ? null : fromCents(rate * playerCount);
  const collectedCents = moneyCents(collected) ?? 0;
  return {
    expected,
    collected: fromCents(collectedCents),
    difference: expected === null || rate === null ? null : fromCents(collectedCents - rate * playerCount),
  };
}

export function buildThirdTimeCategoryReport({
  year,
  categoryCode,
  players,
  fees,
}: {
  year: number;
  categoryCode: string | null;
  players: readonly ThirdTimeReportPlayer[];
  fees: readonly ThirdTimeReportFee[];
}): ThirdTimeCategoryReport {
  const keptPlayers = players
    .filter((player) => player.categoryCode === categoryCode)
    .sort((left, right) => left.displayName.localeCompare(right.displayName, "es"));
  const playerIds = new Set(keptPlayers.map((player) => player.id));
  const yearText = String(year);
  const keptFees = fees.filter((fee) => {
    if (fee.deleted || fee.categoryCode !== categoryCode || !playerIds.has(fee.playerId)) return false;
    if (fee.chargedOn.slice(0, 4) !== yearText) return false;
    const month = Number(fee.chargedOn.slice(5, 7));
    return month >= 1 && month <= 12;
  });
  const feesByPlayer = new Map<string, ThirdTimeReportFee[]>();
  for (const fee of keptFees) {
    const bucket = feesByPlayer.get(fee.playerId);
    if (bucket) bucket.push(fee);
    else feesByPlayer.set(fee.playerId, [fee]);
  }

  const rows = keptPlayers.map((player) => {
    const playerFees = feesByPlayer.get(player.id) ?? [];
    const byMonth = monthBuckets(playerFees);
    return {
      playerId: player.id,
      displayName: player.displayName,
      portraitSrc: player.portraitSrc ?? "",
      cells: byMonth.map(cellFor),
      total: sumThirdTimeAmounts(playerFees),
    };
  });

  const feesByMonth = monthBuckets(keptFees);
  return {
    year,
    categoryCode,
    months: thirdTimeReportMonthLabels,
    rows,
    columnTotals: feesByMonth.map((monthFees) => sumThirdTimeAmounts(monthFees)),
    grandTotal: sumThirdTimeAmounts(keptFees),
    statusMix: feesByMonth.map((monthFees) => thirdTimeStatusShares(monthFees)),
    collectedByMonth: feesByMonth.map((monthFees) =>
      sumThirdTimeAmounts(monthFees.filter((fee) => fee.status === "PAID")),
    ),
  };
}

function monthFromParam(value: string | string[] | undefined, now: Date): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw !== undefined && /^\d+$/.test(raw)) {
    const month = Number(raw);
    if (month >= 1 && month <= 12) return month;
  }
  return defaultThirdTimePeriod(now).month;
}

function yearFromParam(value: string | string[] | undefined, now: Date): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw !== undefined && /^\d+$/.test(raw)) {
    const year = Number(raw);
    if (year >= 2000 && year <= 2100) return year;
  }
  return Number(clubDate(now).slice(0, 4));
}

function categoryFromParam(value: string | string[] | undefined): string | null {
  const entries = value === undefined ? [] : Array.isArray(value) ? value : [value];
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function monthBuckets(fees: readonly ThirdTimeReportFee[]): ThirdTimeReportFee[][] {
  const buckets: ThirdTimeReportFee[][] = Array.from({ length: 12 }, () => []);
  for (const fee of fees) {
    const month = Number(fee.chargedOn.slice(5, 7));
    buckets[month - 1].push(fee);
  }
  return buckets;
}

const playerColumnWidth = 168;
const monthColumnWidth = 88;
const totalColumnWidth = 112;

export function defaultThirdTimeReportColumnWidths(): number[] {
  return [playerColumnWidth, ...thirdTimeReportMonthLabels.map(() => monthColumnWidth), totalColumnWidth];
}

const playerCellPadding = 24;
const monthCellPadding = 16;
const playerAvatarSlot = 40;

export function thirdTimeReportFittedWidths({
  headerWidth,
  nameWidths,
  monthWidths,
  totalHeaderWidth,
  totalWidths,
}: {
  headerWidth: number;
  nameWidths: readonly number[];
  monthWidths: readonly number[];
  totalHeaderWidth: number;
  totalWidths: readonly number[];
}): number[] {
  const names = widest(nameWidths);
  const totals = widest(totalWidths);
  const player = Math.max(
    thirdTimeReportColumnMinimum(0),
    Math.ceil(playerCellPadding + headerWidth),
    Math.ceil(playerCellPadding + playerAvatarSlot + names),
  );
  const months = thirdTimeReportMonthLabels.map((_, index) =>
    Math.max(
      thirdTimeReportColumnMinimum(index + 1),
      Math.ceil(monthCellPadding + (monthWidths[index] ?? 0)),
    ),
  );
  const total = Math.max(
    thirdTimeReportColumnMinimum(thirdTimeReportMonthLabels.length + 1),
    Math.ceil(playerCellPadding + Math.max(totalHeaderWidth, totals)),
  );
  return [player, ...months, total];
}

function widest(values: readonly number[]): number {
  return values.reduce((max, value) => Math.max(max, Number.isFinite(value) ? value : 0), 0);
}

export function thirdTimeReportColumnMinimum(index: number): number {
  if (index <= 0) return 96;
  if (index >= thirdTimeReportMonthLabels.length + 1) return 80;
  return 56;
}

export function adjustThirdTimeReportColumnWidth(width: number, delta: number, minimum: number): number {
  if (!Number.isFinite(delta) || !Number.isFinite(width)) return Number.isFinite(width) ? width : minimum;
  return Math.max(minimum, Math.round(width + delta));
}

function roundedPercents(counts: readonly number[]): number[] {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return counts.map(() => 0);
  const exact = counts.map((count) => (count * 100) / total);
  const floors = exact.map((value) => Math.floor(value));
  let remainder = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  const percents = floors.slice();
  for (const entry of order) {
    if (remainder === 0) break;
    percents[entry.index] += 1;
    remainder -= 1;
  }
  return percents;
}

function moneyCents(amount: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(amount)) return null;
  const [whole, fraction = "00"] = amount.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function fromCents(value: number): string {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

function cellFor(fees: readonly ThirdTimeReportFee[]): ThirdTimeReportCell {
  if (fees.length === 0) return emptyCell();
  const statuses = new Set(fees.map((fee) => fee.status));
  const amount = fees.every((fee) => fee.amount === null) ? null : sumThirdTimeAmounts(fees);
  return {
    status: statuses.size === 1 ? fees[0].status : "MIXED",
    amount,
    feeCount: fees.length,
  };
}
