import { legacyCategoryRows, legacyPlayerRows } from "./legacy-roster-data.ts";

export type RosterStatus = "ACTIVE" | "INACTIVE";

export type LegacyCategory = {
  code: string;
  description: string;
  active: boolean;
};

export type LegacyPlayer = {
  legacyId: number;
  displayName: string;
  categoryCode: string;
  rosterStatus: RosterStatus;
  statusReason: string | null;
  statusChangedOn: string | null;
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function rosterDateFromExcelSerial(serial: number): string {
  if (!Number.isInteger(serial) || serial < 1) {
    throw new Error("Excel roster dates must be positive integers");
  }

  // The spreadsheet 1900 date system matches Excel after its fictional leap day
  // when counted from 1899-12-30.
  const utc = Date.UTC(1899, 11, 30) + serial * MILLISECONDS_PER_DAY;
  return new Date(utc).toISOString().slice(0, 10);
}

export const legacyCategories: LegacyCategory[] = legacyCategoryRows.map((row) => ({
  code: row.code,
  description: row.description,
  active: row.active,
}));

export const legacyPlayers: LegacyPlayer[] = legacyPlayerRows.map((row) => ({
  legacyId: row.legacyId,
  displayName: row.displayName,
  categoryCode: row.categoryCode,
  rosterStatus: row.rosterStatus,
  statusReason: row.statusReason,
  statusChangedOn: row.statusChangedOn,
}));
