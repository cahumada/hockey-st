import { parseMoney } from "./expenses.ts";

export function parseNumericDraft(input: string): number | null {
  const canonical = parseMoney(input.replaceAll("$", ""));
  if (!canonical) return null;
  const value = Number(canonical);
  return Number.isFinite(value) ? value : null;
}

export function formatNumericDisplay(
  value: number,
  locale: string,
  minimumFractionDigits: number,
  maximumFractionDigits: number,
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function numericEditDraft(value: number, maximumFractionDigits: number): string {
  return value.toFixed(maximumFractionDigits).replace(".", ",");
}

export function formatNumericOnBlur(
  input: string,
  options: {
    locale: string;
    minimumFractionDigits: number;
    maximumFractionDigits: number;
    min?: number;
    max?: number;
  },
): { text: string; value: number | undefined } {
  if (!input.trim()) return { text: "", value: undefined };
  const parsed = parseNumericDraft(input);
  const outOfRange =
    parsed === null ||
    (options.min !== undefined && parsed < options.min) ||
    (options.max !== undefined && parsed > options.max);
  if (parsed === null || outOfRange) return { text: input, value: undefined };
  return {
    text: formatNumericDisplay(
      parsed,
      options.locale,
      options.minimumFractionDigits,
      options.maximumFractionDigits,
    ),
    value: parsed,
  };
}
