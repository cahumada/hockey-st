const excelEpochUtc = Date.UTC(1899, 11, 30);
const dayMs = 86_400_000;

const spanishMonths = [
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

const expenseTypeAliases: Record<string, string> = {
  Afajores: "Alfajores",
};

export type LegacyExpenseCells = {
  legacyRow: number;
  excelDateSerial: number;
  expenseType: string;
  unitAmount: number;
  quantity: number;
  collaboratorLabel: string;
  notes: string;
  verified: number;
  driveUrl: string | null;
};

export type ParsedLegacyExpense = {
  legacyRow: number;
  spentOn: string;
  expenseTypeDescription: string;
  unitAmount: string;
  quantity: string;
  total: string;
  collaborator: {
    categoryCode: string | null;
    displayName: string;
  };
  notes: string | null;
  verified: boolean;
  driveFileId: string | null;
  monthLabel: string;
  year: number;
};

function money(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function excelSerialToIsoDate(serial: number): string {
  const date = new Date(excelEpochUtc + serial * dayMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthLabel(isoDate: string): string {
  const month = Number(isoDate.slice(5, 7));
  return `${isoDate.slice(5, 7)} - ${spanishMonths[month - 1]}`;
}

function parseCollaboratorLabel(label: string): ParsedLegacyExpense["collaborator"] {
  const separator = " - ";
  const splitAt = label.indexOf(separator);
  if (splitAt === -1) {
    return { categoryCode: null, displayName: label.trim() };
  }

  const left = label.slice(0, splitAt).trim();
  const right = label.slice(splitAt + separator.length).trim();
  if (/^\d/.test(left)) {
    return { categoryCode: left, displayName: right };
  }

  return { categoryCode: null, displayName: left };
}

function driveFileId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([^/]+)/);
  return match?.[1] ?? null;
}

export function parseLegacyExpenseRow(row: LegacyExpenseCells): ParsedLegacyExpense {
  const spentOn = excelSerialToIsoDate(row.excelDateSerial);
  const notes = row.notes.trim();

  return {
    legacyRow: row.legacyRow,
    spentOn,
    expenseTypeDescription: expenseTypeAliases[row.expenseType] ?? row.expenseType,
    unitAmount: money(row.unitAmount),
    quantity: money(row.quantity),
    total: money(row.unitAmount * row.quantity),
    collaborator: parseCollaboratorLabel(row.collaboratorLabel),
    notes: notes.length > 0 ? notes : null,
    verified: row.verified === 1,
    driveFileId: driveFileId(row.driveUrl),
    monthLabel: monthLabel(spentOn),
    year: Number(spentOn.slice(0, 4)),
  };
}
