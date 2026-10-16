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

const statuses = {
  Pagado: "PAID",
  Pendiente: "PENDING",
  Exento: "EXEMPT",
} as const;

export type ThirdTimeFeeStatus = (typeof statuses)[keyof typeof statuses];

export type LegacyThirdTimeCells = {
  legacyRow: number;
  playerName: string;
  categoryCode: string;
  amount: number | null;
  excelChargedOn: number;
  excelPaidOn: number | null;
  receiptText: string;
  driveUrl: string | null;
  channel: string;
  status: string;
  controllerName: string;
  notes: string;
};

export type ParsedLegacyThirdTime = {
  legacyRow: number;
  playerName: string;
  categoryCode: string;
  amount: string | null;
  chargedOn: string;
  paidOn: string | null;
  receiptReference: string | null;
  driveFileId: string | null;
  channel: string | null;
  status: ThirdTimeFeeStatus;
  controllerName: string;
  notes: string | null;
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

function driveFileId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([^/]+)/);
  return match?.[1] ?? null;
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function parseLegacyThirdTimeRow(row: LegacyThirdTimeCells): ParsedLegacyThirdTime {
  const status = statuses[row.status as keyof typeof statuses];
  if (!status) {
    throw new Error(`Estado desconocido en la fila ${row.legacyRow}: ${row.status}`);
  }

  const chargedOn = excelSerialToIsoDate(row.excelChargedOn);
  const receiptText = row.receiptText.trim();
  const receiptIsLink = receiptText.toLowerCase() === "link";

  return {
    legacyRow: row.legacyRow,
    playerName: row.playerName.trim(),
    categoryCode: row.categoryCode.trim(),
    amount: row.amount === null ? null : money(row.amount),
    chargedOn,
    paidOn: row.excelPaidOn === null ? null : excelSerialToIsoDate(row.excelPaidOn),
    receiptReference: receiptIsLink ? null : blankToNull(receiptText),
    driveFileId: driveFileId(row.driveUrl),
    channel: blankToNull(row.channel),
    status,
    controllerName: row.controllerName.trim(),
    notes: blankToNull(row.notes),
    monthLabel: monthLabel(chargedOn),
    year: Number(chargedOn.slice(0, 4)),
  };
}
