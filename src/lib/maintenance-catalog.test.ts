import assert from "node:assert/strict";
import { test } from "node:test";
import {
  browseMaintenanceCatalog,
  nextCatalogLegacyId,
  parseCatalogEntry,
} from "./maintenance-catalog.ts";

const rows = [
  { legacyId: 1, description: "Cancha Chicago", status: "ACTIVE" as const },
  { legacyId: 3, description: "Árbitro", status: "ACTIVE" as const },
  { legacyId: 15, description: "Otros", status: "INACTIVE" as const },
];

test("the next catalog legacy id starts at 1 and follows the current max", () => {
  assert.equal(nextCatalogLegacyId(null), 1);
  assert.equal(nextCatalogLegacyId(15), 16);
});

test("parse catalog entry trims the description and accepts both statuses", () => {
  assert.deepEqual(parseCatalogEntry({ description: "  Árbitro  ", status: "ACTIVE" }), {
    ok: true,
    description: "Árbitro",
    status: "ACTIVE",
  });
  assert.deepEqual(parseCatalogEntry({ description: "Otros", status: "INACTIVE" }), {
    ok: true,
    description: "Otros",
    status: "INACTIVE",
  });
  assert.equal(parseCatalogEntry({ description: "a".repeat(120), status: "ACTIVE" }).ok, true);
});

test("parse catalog entry rejects a blank description, an unknown status, and a long description", () => {
  const blank = parseCatalogEntry({ description: "   ", status: "ACTIVE" });
  assert.equal(blank.ok, false);
  if (!blank.ok) {
    assert.equal(blank.message, "Escribí una descripción.");
  }

  const status = parseCatalogEntry({ description: "Otros", status: "baja" });
  assert.equal(status.ok, false);
  if (!status.ok) {
    assert.equal(status.message, "Elegí un estado.");
  }

  const long = parseCatalogEntry({ description: "a".repeat(121), status: "ACTIVE" });
  assert.equal(long.ok, false);
  if (!long.ok) {
    assert.equal(long.message, "Usá 120 caracteres o menos.");
  }
});

test("browse matches an accented description and a legacy id", () => {
  const byDescription = browseMaintenanceCatalog(rows, { text: "arbitro", status: "all" });
  assert.deepEqual(
    byDescription.rows.map((row) => row.legacyId),
    [3],
  );
  assert.deepEqual(byDescription.totals, { shown: 1, active: 1, inactive: 0 });

  const byLegacyId = browseMaintenanceCatalog(rows, { text: "15", status: "all" });
  assert.deepEqual(
    byLegacyId.rows.map((row) => row.legacyId),
    [15],
  );
  assert.deepEqual(byLegacyId.totals, { shown: 1, active: 0, inactive: 1 });
});

test("browse filters active and inactive rows and totals only the visible rows", () => {
  const active = browseMaintenanceCatalog(rows, { text: "", status: "active" });
  assert.deepEqual(
    active.rows.map((row) => row.legacyId),
    [1, 3],
  );
  assert.deepEqual(active.totals, { shown: 2, active: 2, inactive: 0 });

  const inactive = browseMaintenanceCatalog(rows, { text: "", status: "inactive" });
  assert.deepEqual(
    inactive.rows.map((row) => row.legacyId),
    [15],
  );
  assert.deepEqual(inactive.totals, { shown: 1, active: 0, inactive: 1 });
});
