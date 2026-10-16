import { parseMoney, formatExpenseMoney } from "./expenses.ts";
import { clubDate } from "./roster.ts";

export const thirdTimePageSize = 20;

export const thirdTimeStatusLabels = {
  PAID: "Pagado",
  PENDING: "Pendiente",
  EXEMPT: "Exento",
} as const;

export type ThirdTimeFeeStatus = keyof typeof thirdTimeStatusLabels;

export type ThirdTimeStatusChoice = "paid" | "pending" | "exempt";

const statusChoices: readonly ThirdTimeStatusChoice[] = ["paid", "pending", "exempt"];

const statusFilters: Record<ThirdTimeStatusChoice, ThirdTimeFeeStatus> = {
  paid: "PAID",
  pending: "PENDING",
  exempt: "EXEMPT",
};

export type ThirdTimeFormValues = {
  playerId: string;
  chargedOn: string;
  paidOn: string;
  amount: string;
  channel: string;
  status: string;
  controllerId: string;
  receiptReference: string;
  notes: string;
};

export type ThirdTimeFormErrors = Partial<Record<keyof ThirdTimeFormValues, string>>;

export type ThirdTimeCatalogs = {
  players: readonly { id: string; categoryCode: string }[];
  collaboratorIds: readonly string[];
  channelNames: readonly string[];
};

export type ParsedThirdTimeFee = {
  playerId: string;
  categoryCode: string;
  chargedOn: string;
  paidOn: string | null;
  amount: string | null;
  channel: string | null;
  status: ThirdTimeFeeStatus;
  controllerId: string;
  receiptReference: string | null;
  notes: string | null;
};

export type ThirdTimeListQuery = {
  text: string;
  statuses: ThirdTimeStatusChoice[];
  years: number[];
  months: number[];
  categoryCodes: string[];
  channels: string[];
  controllerIds: string[];
  page: number;
};

export type ThirdTimeListParams = Record<string, string | string[] | undefined>;

export type ThirdTimeOverviewCard = {
  id: "current-month" | "previous-month" | "six-months" | "current-year";
  title: string;
  period: string;
  count: number;
  amount: string;
  share: number;
  change: "up" | "down" | "same" | null;
  changeLabel: string | null;
  listPeriod: { year: number; month: number | null } | null;
};

export function validateThirdTimeFormValues(
  values: ThirdTimeFormValues,
  catalogs: ThirdTimeCatalogs,
): { ok: true; value: ParsedThirdTimeFee } | { ok: false; errors: ThirdTimeFormErrors } {
  const errors: ThirdTimeFormErrors = {};
  const player = catalogs.players.find((item) => item.id === values.playerId);
  if (!player) errors.playerId = "Elegí una jugadora.";

  const chargedOn = normalizeThirdTimeChargedMonth(values.chargedOn);
  if (!chargedOn) errors.chargedOn = "Elegí un mes.";

  const paidOnRaw = values.paidOn.trim();
  if (paidOnRaw && !isIsoDate(paidOnRaw)) errors.paidOn = "Ingresá una fecha válida.";

  const amountRaw = values.amount.trim();
  const amount = amountRaw ? parseMoney(values.amount) : null;
  if (amountRaw && !amount) errors.amount = "El importe no es válido.";

  const channel = blankToNull(values.channel);
  if (channel && !catalogs.channelNames.includes(channel)) errors.channel = "Elegí un canal.";

  if (!isFeeStatus(values.status)) errors.status = "Elegí un estado.";

  if (!catalogs.collaboratorIds.includes(values.controllerId)) {
    errors.controllerId = "Elegí un colaborador.";
  }

  if (Object.keys(errors).length > 0 || !player || !chargedOn || !isFeeStatus(values.status)) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      playerId: player.id,
      categoryCode: player.categoryCode,
      chargedOn,
      paidOn: paidOnRaw || null,
      amount,
      channel,
      status: values.status,
      controllerId: values.controllerId,
      receiptReference: blankToNull(values.receiptReference),
      notes: blankToNull(values.notes),
    },
  };
}

export function defaultThirdTimePeriod(now = new Date()): { year: number; month: number } {
  const [year, month] = clubDate(now).split("-");
  return { year: Number(year), month: Number(month) };
}

export function parseThirdTimeListQuery(
  params: ThirdTimeListParams,
  now = new Date(),
): { query: ThirdTimeListQuery; explicitPeriod: boolean } {
  const defaults = defaultThirdTimePeriod(now);
  const years = parseYearList(params.year);
  const months = parseMonthList(params.month);
  const explicitPeriod = years !== undefined && months !== undefined;
  const pageRaw = Number(firstParam(params.page));

  return {
    explicitPeriod,
    query: {
      text: firstParam(params.q).trim(),
      statuses: parseStatusList(params.status),
      years: years === undefined ? [defaults.year] : years,
      months: months === undefined ? [defaults.month] : months,
      categoryCodes: uniqueTokens(paramList(params.category).filter((value) => value !== "all")),
      channels: uniqueTokens(paramList(params.channel).filter((value) => value !== "all")),
      controllerIds: uniqueTokens(paramList(params.controller).filter((value) => value !== "all")),
      page: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    },
  };
}

export function thirdTimeListSearchParams(query: ThirdTimeListQuery): string {
  const params = new URLSearchParams();
  if (query.text) params.set("q", query.text);
  appendList(params, "status", query.statuses);
  appendList(params, "year", query.years.map(String), true);
  appendList(params, "month", query.months.map(String), true);
  appendList(params, "category", query.categoryCodes);
  appendList(params, "channel", query.channels);
  appendList(params, "controller", query.controllerIds);
  if (query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

export function thirdTimePageCount(matchCount: number): number {
  return Math.max(1, Math.ceil(matchCount / thirdTimePageSize));
}

export function thirdTimeChargedOnBounds(
  query: Pick<ThirdTimeListQuery, "years" | "months">,
  knownYears: readonly number[],
): { gte: string; lt: string }[] | null {
  if (query.years.length === 0 && query.months.length === 0) return null;
  if (query.years.length > 0 && query.months.length > 0) {
    return query.years.flatMap((year) => query.months.map((month) => monthRange(year, month)));
  }
  if (query.years.length > 0) {
    return query.years.map((year) => ({ gte: `${year}-01-01`, lt: `${year + 1}-01-01` }));
  }
  const years = [...new Set(knownYears)].sort((left, right) => left - right);
  const fallback = years.length > 0 ? years : [defaultThirdTimePeriod().year];
  return fallback.flatMap((year) => query.months.map((month) => monthRange(year, month)));
}

export function sumThirdTimeAmounts(rows: readonly { amount: string | null }[]): string {
  return fromCents(rows.reduce((sum, row) => sum + (row.amount ? cents(row.amount) : 0), 0));
}

export function thirdTimeOverview(
  rows: readonly { chargedOn: string; amount: string | null }[],
  now = new Date(),
): ThirdTimeOverviewCard[] {
  const current = defaultThirdTimePeriod(now);
  const previous = shiftMonth(current.year, current.month, -1);
  const sixStart = shiftMonth(current.year, current.month, -5);
  const windows = [
    {
      id: "current-month" as const,
      title: "Este mes",
      period: monthTitle(current.year, current.month),
      gte: monthRange(current.year, current.month).gte,
      lt: monthRange(current.year, current.month).lt,
      listPeriod: { year: current.year, month: current.month },
    },
    {
      id: "previous-month" as const,
      title: "Mes anterior",
      period: monthTitle(previous.year, previous.month),
      gte: monthRange(previous.year, previous.month).gte,
      lt: monthRange(previous.year, previous.month).lt,
      listPeriod: { year: previous.year, month: previous.month },
    },
    {
      id: "six-months" as const,
      title: "Últimos 6 meses",
      period: rangeTitle(sixStart, current),
      gte: monthRange(sixStart.year, sixStart.month).gte,
      lt: monthRange(current.year, current.month).lt,
      listPeriod: null,
    },
    {
      id: "current-year" as const,
      title: "Este año",
      period: String(current.year),
      gte: `${current.year}-01-01`,
      lt: `${current.year + 1}-01-01`,
      listPeriod: { year: current.year, month: null },
    },
  ];
  const totals = windows.map((window) => {
    const matched = rows.filter((row) => row.chargedOn >= window.gte && row.chargedOn < window.lt);
    return {
      window,
      count: matched.length,
      cents: matched.reduce((sum, row) => sum + (row.amount ? cents(row.amount) : 0), 0),
    };
  });
  const largest = Math.max(...totals.map((total) => total.cents));
  const compared = monthChange(
    totals[0].cents,
    totals[1].cents,
    monthNames[previous.month - 1],
  );

  return totals.map((total) => ({
    id: total.window.id,
    title: total.window.title,
    period: total.window.period,
    count: total.count,
    amount: fromCents(total.cents),
    share: largest === 0 ? 0 : Math.round((total.cents / largest) * 100),
    change: total.window.id === "current-month" ? compared.change : null,
    changeLabel: total.window.id === "current-month" ? compared.label : null,
    listPeriod: total.window.listPeriod,
  }));
}

export function thirdTimeSummary(totals: { count: number; amount: string }): string {
  const noun = totals.count === 1 ? "cuota" : "cuotas";
  return `${totals.count} ${noun} · ${formatExpenseMoney(totals.amount)}`;
}

export function feeStatusesFromFilter(statuses: readonly ThirdTimeStatusChoice[]): ThirdTimeFeeStatus[] {
  return statuses.map((status) => statusFilters[status]);
}

export type CategoryFeeBatchValues = {
  categoryCode: string;
  chargedOn: string;
  amount: string;
  status: string;
  controllerId: string;
};

export type CategoryFeeBatchErrors = Partial<Record<keyof CategoryFeeBatchValues, string>> & {
  form?: string;
};

export type PlannedCategoryFees = {
  categoryCode: string;
  chargedOn: string;
  amount: string | null;
  status: ThirdTimeFeeStatus;
  controllerId: string;
  playerIds: string[];
};

export function planCategoryFeeBatch(
  values: CategoryFeeBatchValues,
  context: {
    categoryCodes: readonly string[];
    players: readonly { id: string; categoryCode: string; active: boolean }[];
    collaboratorIds: readonly string[];
    existingCount: number;
  },
): { ok: true; value: PlannedCategoryFees } | { ok: false; message: string; errors: CategoryFeeBatchErrors } {
  const errors: CategoryFeeBatchErrors = {};
  const categoryCode = values.categoryCode.trim();
  if (!context.categoryCodes.includes(categoryCode)) errors.categoryCode = "Elegí una categoría.";

  const chargedOn = normalizeThirdTimeChargedMonth(values.chargedOn);
  if (!chargedOn) errors.chargedOn = "Elegí un mes.";

  const amountRaw = values.amount.trim();
  const amount = amountRaw ? parseMoney(values.amount) : null;
  if (amountRaw && !amount) errors.amount = "El importe no es válido.";

  if (!isFeeStatus(values.status)) errors.status = "Elegí un estado.";

  if (!context.collaboratorIds.includes(values.controllerId)) {
    errors.controllerId = "Elegí un colaborador.";
  }

  if (Object.keys(errors).length > 0 || !chargedOn || !isFeeStatus(values.status)) {
    return { ok: false, message: "Revisá los datos de la cuota.", errors };
  }

  if (context.existingCount > 0) {
    return {
      ok: false,
      message: "Ya hay cuotas cargadas para esa categoría en ese mes.",
      errors: { form: "Ya hay cuotas cargadas para esa categoría en ese mes." },
    };
  }

  const playerIds = context.players
    .filter((player) => player.active && player.categoryCode === categoryCode)
    .map((player) => player.id);
  if (playerIds.length === 0) {
    return {
      ok: false,
      message: "No hay jugadoras activas en esa categoría.",
      errors: { form: "No hay jugadoras activas en esa categoría." },
    };
  }

  return {
    ok: true,
    value: {
      categoryCode,
      chargedOn,
      amount,
      status: values.status,
      controllerId: values.controllerId,
      playerIds,
    },
  };
}

export function thirdTimeChargedMonth(value: string): string | null {
  return normalizeThirdTimeChargedMonth(value);
}

export function defaultCategoryCollaboratorId(
  collaborators: readonly { id: string; categoryCode: string | null; active: boolean; kind?: string }[],
  categoryCode: string,
): string | null {
  const matches = collaborators.filter((item) => item.active && item.categoryCode === categoryCode);
  return (matches.find((item) => item.kind === "THIRD_TIME") ?? matches[0])?.id ?? null;
}

const monthNames = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

function isFeeStatus(value: string): value is ThirdTimeFeeStatus {
  return value === "PAID" || value === "PENDING" || value === "EXEMPT";
}

function isStatusChoice(value: string): value is ThirdTimeStatusChoice {
  return value === "paid" || value === "pending" || value === "exempt";
}

function paramList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean);
}

function uniqueTokens(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function parseStatusList(value: string | string[] | undefined): ThirdTimeStatusChoice[] {
  const picked = new Set(paramList(value).filter(isStatusChoice));
  return statusChoices.filter((status) => picked.has(status));
}

function parseYearList(value: string | string[] | undefined): number[] | undefined {
  const tokens = paramList(value);
  if (tokens.length === 0) return undefined;
  if (tokens.includes("all")) return [];
  const years = uniqueNumbers(
    tokens.flatMap((token) => {
      if (!/^\d{4}$/.test(token)) return [];
      const year = Number(token);
      return year >= 2000 && year <= 2100 ? [year] : [];
    }),
  ).sort((left, right) => right - left);
  return years.length > 0 ? years : undefined;
}

function parseMonthList(value: string | string[] | undefined): number[] | undefined {
  const tokens = paramList(value);
  if (tokens.length === 0) return undefined;
  if (tokens.includes("all")) return [];
  const months = uniqueNumbers(
    tokens.flatMap((token) => {
      if (!/^\d{1,2}$/.test(token)) return [];
      const month = Number(token);
      return month >= 1 && month <= 12 ? [month] : [];
    }),
  ).sort((left, right) => left - right);
  return months.length > 0 ? months : undefined;
}

function uniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values)];
}

function appendList(params: URLSearchParams, key: string, values: readonly string[], emptyMeansAll = false) {
  if (values.length === 0) {
    if (emptyMeansAll) params.append(key, "all");
    return;
  }
  for (const value of values) params.append(key, value);
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function cents(amount: string): number {
  const [whole, fraction = "00"] = amount.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function fromCents(value: number): string {
  const whole = Math.floor(value / 100);
  const fraction = String(value % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function formatThirdTimeMonth(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  return monthTitle(Number(match[1]), Number(match[2]));
}

function normalizeThirdTimeChargedMonth(value: string): string | null {
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  if (match[3] !== undefined && !isIsoDate(trimmed)) return null;
  return `${match[1]}-${match[2]}-01`;
}

function monthTitle(year: number, month: number): string {
  const name = monthNames[month - 1];
  return `${name.charAt(0).toLocaleUpperCase("es")}${name.slice(1)} ${year}`;
}

function rangeTitle(
  start: { year: number; month: number },
  end: { year: number; month: number },
): string {
  const startName = monthNames[start.month - 1];
  const endName = monthNames[end.month - 1];
  const startLabel = `${startName.charAt(0).toLocaleUpperCase("es")}${startName.slice(1)}`;
  if (start.year === end.year) return `${startLabel} – ${endName} ${end.year}`;
  return `${startLabel} ${start.year} – ${endName} ${end.year}`;
}

function monthChange(
  currentCents: number,
  previousCents: number,
  previousName: string,
): { change: "up" | "down" | "same"; label: string } {
  if (previousCents === 0 && currentCents === 0) {
    return { change: "same", label: `Sin cuotas en ${previousName} ni este mes` };
  }
  if (previousCents === 0) {
    return { change: "up", label: `Sin cuotas en ${previousName}` };
  }
  const percent = Math.round((Math.abs(currentCents - previousCents) / previousCents) * 100);
  if (percent === 0) return { change: "same", label: `Igual que ${previousName}` };
  if (currentCents > previousCents) {
    return { change: "up", label: `Subió ${percent}% frente a ${previousName}` };
  }
  return { change: "down", label: `Bajó ${percent}% frente a ${previousName}` };
}

function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? "";
}

function parseYearParam(value: string): number | null | undefined {
  if (!value) return undefined;
  if (value === "all") return null;
  if (!/^\d{4}$/.test(value)) return undefined;
  const year = Number(value);
  return year >= 2000 && year <= 2100 ? year : undefined;
}

function parseMonthParam(value: string): number | null | undefined {
  if (!value) return undefined;
  if (value === "all") return null;
  if (!/^\d{1,2}$/.test(value)) return undefined;
  const month = Number(value);
  return month >= 1 && month <= 12 ? month : undefined;
}

function monthRange(year: number, month: number): { gte: string; lt: string } {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    gte: `${year}-${String(month).padStart(2, "0")}-01`,
    lt: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}
