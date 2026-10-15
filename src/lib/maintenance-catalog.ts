import type { CatalogStatus } from "./legacy-maintenance-catalogs.ts";

export type { CatalogStatus };

export const catalogStatusLabels: Record<CatalogStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

const DESCRIPTION_MAX = 120;

export type CatalogBrowseStatus = "all" | "active" | "inactive";

export type CatalogBrowseRow = {
  description: string;
  legacyId: number;
  status: CatalogStatus;
};

export function nextCatalogLegacyId(currentMax: number | null): number {
  return (currentMax ?? 0) + 1;
}

export function parseCatalogEntry(input: {
  description: string;
  status: string;
}):
  | { ok: true; description: string; status: CatalogStatus }
  | { ok: false; message: string } {
  const description = input.description.trim();
  if (description.length === 0) {
    return { ok: false, message: "Escribí una descripción." };
  }
  if (description.length > DESCRIPTION_MAX) {
    return { ok: false, message: `Usá ${DESCRIPTION_MAX} caracteres o menos.` };
  }

  const status = input.status.trim();
  if (status !== "ACTIVE" && status !== "INACTIVE") {
    return { ok: false, message: "Elegí un estado." };
  }

  return { ok: true, description, status };
}

export function browseMaintenanceCatalog<T extends CatalogBrowseRow>(
  rows: readonly T[],
  query: { text: string; status: CatalogBrowseStatus },
): {
  rows: T[];
  totals: { shown: number; active: number; inactive: number };
} {
  const needle = fold(query.text.trim());
  const visible = rows.filter(
    (row) => matchesText(row, needle) && matchesStatus(row, query.status),
  );

  return { rows: visible, totals: countStatuses(visible) };
}

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function matchesText(row: CatalogBrowseRow, needle: string): boolean {
  if (needle.length === 0) {
    return true;
  }

  return fold(row.description).includes(needle) || String(row.legacyId).includes(needle);
}

function matchesStatus(row: CatalogBrowseRow, status: CatalogBrowseStatus): boolean {
  if (status === "all") {
    return true;
  }

  return row.status === (status === "active" ? "ACTIVE" : "INACTIVE");
}

function countStatuses<T extends CatalogBrowseRow>(rows: readonly T[]) {
  let active = 0;
  let inactive = 0;

  for (const row of rows) {
    if (row.status === "ACTIVE") {
      active += 1;
    } else {
      inactive += 1;
    }
  }

  return { shown: rows.length, active, inactive };
}
