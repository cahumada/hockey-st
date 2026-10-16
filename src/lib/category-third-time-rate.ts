import { parseMoney } from "./expenses.ts";

const NOTE_MAX = 200;

export type CategoryRateCurrent = {
  amount: string | null;
};

export type CategoryRateChangeInput = {
  amount: string;
  updatedOn: string;
  note: string;
};

export type CategoryRateChangeErrors = Partial<Record<"amount" | "updatedOn" | "note", string>>;

export type PlannedCategoryRateChange = {
  previousAmount: string | null;
  amount: string;
  updatedOn: string;
  note: string | null;
};

export function planCategoryRateChange(
  current: CategoryRateCurrent,
  input: CategoryRateChangeInput,
  today: string,
):
  | { ok: true; value: PlannedCategoryRateChange }
  | { ok: false; message: string; errors: CategoryRateChangeErrors } {
  const errors: CategoryRateChangeErrors = {};
  const amountRaw = input.amount.trim();
  const amount = amountRaw ? parseMoney(input.amount) : null;
  if (!amountRaw) errors.amount = "Ingresá el importe.";
  else if (!amount) errors.amount = "El importe no es válido.";

  const updatedOn = input.updatedOn.trim();
  if (!isIsoDate(updatedOn)) errors.updatedOn = "Elegí una fecha.";
  else if (updatedOn > today) errors.updatedOn = "La fecha no puede ser posterior a hoy.";

  const note = input.note.trim();
  if (note.length > NOTE_MAX) errors.note = `Usá ${NOTE_MAX} caracteres o menos.`;

  const previousAmount = normalizeStoredAmount(current.amount);
  if (amount && previousAmount && amount === previousAmount) {
    errors.amount = "El importe no cambió.";
  }

  if (Object.keys(errors).length > 0 || !amount || !isIsoDate(updatedOn) || updatedOn > today) {
    return { ok: false, message: "Revisá el monto de la categoría.", errors };
  }

  return {
    ok: true,
    value: {
      previousAmount,
      amount,
      updatedOn,
      note: note.length > 0 ? note : null,
    },
  };
}

function normalizeStoredAmount(amount: string | null): string | null {
  if (!amount) return null;
  return parseMoney(amount) ?? amount;
}

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
