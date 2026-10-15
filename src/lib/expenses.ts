import { clubDate } from "./roster.ts";

export const maxReceiptBytes = 5 * 1024 * 1024;

export const receiptStorageUnavailableMessage =
  "No podemos guardar el comprobante en este entorno. Dejá el archivo vacío o pedí ayuda al administrador del club.";

const receiptContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export type ExpenseFormValues = {
  spentOn: string;
  expenseTypeId: string;
  unitAmount: string;
  quantity: string;
  collaboratorId: string;
  notes: string;
};

export type ExpenseFormErrors = Partial<Record<keyof ExpenseFormValues | "receipt", string>>;

export type ParsedExpense = {
  spentOn: string;
  expenseTypeId: string;
  unitAmount: string;
  quantity: string;
  total: string;
  collaboratorId: string;
  notes: string | null;
};

export type ExpenseCatalogs = {
  expenseTypeIds: readonly string[];
  collaboratorIds: readonly string[];
};

export type ExpenseVerifiedFilter = "all" | "verified" | "pending";

export const expensePageSize = 20;

export type ExpenseListQuery = {
  text: string;
  status: ExpenseVerifiedFilter;
  year: number | null;
  month: number | null;
  expenseTypeId: string | null;
  collaboratorId: string | null;
  page: number;
};

export type ExpenseListParams = Record<string, string | string[] | undefined>;

export function validateExpenseFormValues(
  values: ExpenseFormValues,
  catalogs: ExpenseCatalogs,
): { ok: true; value: ParsedExpense } | { ok: false; errors: ExpenseFormErrors } {
  const errors: ExpenseFormErrors = {};
  const spentOn = values.spentOn.trim();
  if (!isIsoDate(spentOn)) {
    errors.spentOn = "Ingresá una fecha válida.";
  }

  if (!catalogs.expenseTypeIds.includes(values.expenseTypeId)) {
    errors.expenseTypeId = "Elegí un tipo de gasto.";
  }

  const unitAmount = parseMoney(values.unitAmount);
  if (!unitAmount || cents(unitAmount) <= 0) {
    errors.unitAmount = "El importe tiene que ser mayor a cero.";
  }

  const quantity = parseMoney(values.quantity);
  if (!quantity || cents(quantity) <= 0) {
    errors.quantity = "La cantidad tiene que ser mayor a cero.";
  }

  if (!catalogs.collaboratorIds.includes(values.collaboratorId)) {
    errors.collaboratorId = "Elegí un colaborador.";
  }

  if (Object.keys(errors).length > 0 || !unitAmount || !quantity) {
    return { ok: false, errors };
  }

  const notes = values.notes.trim();
  return {
    ok: true,
    value: {
      spentOn,
      expenseTypeId: values.expenseTypeId,
      unitAmount,
      quantity,
      total: multiplyMoney(unitAmount, quantity),
      collaboratorId: values.collaboratorId,
      notes: notes.length > 0 ? notes : null,
    },
  };
}

export function defaultExpensePeriod(now = new Date()): { year: number; month: number } {
  const [year, month] = clubDate(now).split("-");
  return { year: Number(year), month: Number(month) };
}

export function parseExpenseListQuery(
  params: ExpenseListParams,
  now = new Date(),
): { query: ExpenseListQuery; explicitPeriod: boolean } {
  const defaults = defaultExpensePeriod(now);
  const yearRaw = firstParam(params.year);
  const monthRaw = firstParam(params.month);
  const year = parseYearParam(yearRaw);
  const month = parseMonthParam(monthRaw);
  const explicitPeriod = year !== undefined && month !== undefined;
  const pageRaw = Number(firstParam(params.page));
  const statusRaw = firstParam(params.status);
  const expenseTypeId = firstParam(params.type);
  const collaboratorId = firstParam(params.collaborator);

  return {
    explicitPeriod,
    query: {
      text: firstParam(params.q).trim(),
      status: statusRaw === "verified" || statusRaw === "pending" ? statusRaw : "all",
      year: year === undefined ? defaults.year : year,
      month: month === undefined ? defaults.month : month,
      expenseTypeId: expenseTypeId || null,
      collaboratorId: collaboratorId || null,
      page: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1,
    },
  };
}

export function expenseListSearchParams(query: ExpenseListQuery): string {
  const params = new URLSearchParams();
  if (query.text) params.set("q", query.text);
  if (query.status !== "all") params.set("status", query.status);
  params.set("year", query.year === null ? "all" : String(query.year));
  params.set("month", query.month === null ? "all" : String(query.month));
  if (query.expenseTypeId) params.set("type", query.expenseTypeId);
  if (query.collaboratorId) params.set("collaborator", query.collaboratorId);
  if (query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

export function expensePageCount(matchCount: number): number {
  return Math.max(1, Math.ceil(matchCount / expensePageSize));
}

export function expenseSpentOnBounds(
  query: Pick<ExpenseListQuery, "year" | "month">,
  knownYears: readonly number[],
): { gte: string; lt: string }[] | null {
  if (query.year && query.month) return [monthRange(query.year, query.month)];
  if (query.year) return [{ gte: `${query.year}-01-01`, lt: `${query.year + 1}-01-01` }];
  if (query.month) {
    const years = [...new Set(knownYears)].sort((left, right) => left - right);
    return (years.length > 0 ? years : [defaultExpensePeriod().year]).map((year) =>
      monthRange(year, query.month as number),
    );
  }
  return null;
}

export function sumExpenseAmounts(
  rows: readonly { unitAmount: string; quantity: string }[],
): string {
  return fromCents(amountCents(rows));
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

export type ExpenseOverviewCard = {
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

export function expenseOverview(
  rows: readonly { spentOn: string; unitAmount: string; quantity: string }[],
  now = new Date(),
): ExpenseOverviewCard[] {
  const current = defaultExpensePeriod(now);
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
    const matched = rows.filter(
      (row) => row.spentOn >= window.gte && row.spentOn < window.lt,
    );
    return { window, count: matched.length, cents: amountCents(matched) };
  });
  const largest = Math.max(...totals.map((total) => total.cents));
  const currentTotal = totals[0];
  const previousTotal = totals[1];
  const compared = monthChange(currentTotal.cents, previousTotal.cents, monthNames[previous.month - 1]);

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

function amountCents(rows: readonly { unitAmount: string; quantity: string }[]): number {
  return rows.reduce((sum, row) => sum + cents(multiplyMoney(row.unitAmount, row.quantity)), 0);
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
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
    return { change: "same", label: `Sin gastos en ${previousName} ni este mes` };
  }
  if (previousCents === 0) {
    return { change: "up", label: `Sin gastos en ${previousName}` };
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

export function verifiedFromReceipt(hasReceipt: boolean): boolean {
  return hasReceipt;
}

export function receiptEmbedKind(contentType: string | null): "image" | "document" {
  return contentType?.startsWith("image/") ? "image" : "document";
}

export function validateReceiptFile(file: {
  type: string;
  size: number;
}): { ok: true } | { ok: false; message: string } {
  if (!receiptContentTypes.has(file.type)) {
    return { ok: false, message: "El comprobante tiene que ser JPG, PNG, WebP o PDF." };
  }
  if (file.size > maxReceiptBytes) {
    return { ok: false, message: "El comprobante no puede superar 5 MB." };
  }
  return { ok: true };
}

export function formatExpenseDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function formatExpenseMoney(amount: string): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(Number(amount));
}

export function expenseSummary(totals: { count: number; amount: string }): string {
  const noun = totals.count === 1 ? "gasto" : "gastos";
  return `${totals.count} ${noun} · ${formatExpenseMoney(totals.amount)}`;
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

export function parseMoney(input: string): string | null {
  const compact = input.trim().replace(/\s/g, "");
  if (!compact) return null;

  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  let normalized = compact;

  if (lastComma !== -1 && lastDot !== -1) {
    normalized =
      lastComma > lastDot
        ? compact.replaceAll(".", "").replace(",", ".")
        : compact.replaceAll(",", "");
  } else if (lastComma !== -1) {
    normalized = compact.replace(",", ".");
  } else if (lastDot !== -1) {
    const parts = compact.split(".");
    const last = parts.at(-1) ?? "";
    const thousands =
      parts.length > 1 &&
      last.length === 3 &&
      parts.slice(1).every((part) => part.length === 3);
    if (thousands) {
      normalized = parts.join("");
    }
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
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

function multiplyMoney(unitAmount: string, quantity: string): string {
  return fromCents(Math.round((cents(unitAmount) * cents(quantity)) / 100));
}
