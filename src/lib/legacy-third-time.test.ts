import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLegacyThirdTimeRow } from "./legacy-third-time.ts";

const driveReceipt =
  "https://drive.google.com/file/d/1Z_eZuf0euDkM5gAubkoAlnqTBHV1qrjz/view?usp=drive_link";

test("parses a paid 3er Tiempo row with a numeric comprobante", () => {
  assert.deepEqual(
    parseLegacyThirdTimeRow({
      legacyRow: 3,
      playerName: "Fabiana, Bravo",
      categoryCode: "9na",
      amount: 20000,
      excelChargedOn: 46054,
      excelPaidOn: 46064,
      receiptText: "145831530308",
      driveUrl: null,
      channel: "Mercado Pago",
      status: "Pagado",
      controllerName: "Natalia Palladino",
      notes: "",
    }),
    {
      legacyRow: 3,
      playerName: "Fabiana, Bravo",
      categoryCode: "9na",
      amount: "20000.00",
      chargedOn: "2026-02-01",
      paidOn: "2026-02-11",
      receiptReference: "145831530308",
      driveFileId: null,
      channel: "Mercado Pago",
      status: "PAID",
      controllerName: "Natalia Palladino",
      notes: null,
      monthLabel: "02 - febrero",
      year: 2026,
    },
  );
});

test("parses a pending row without amount, payment date, or channel", () => {
  const parsed = parseLegacyThirdTimeRow({
    legacyRow: 200,
    playerName: "Roccasalvo Clementina Luz",
    categoryCode: "8va",
    amount: null,
    excelChargedOn: 46296,
    excelPaidOn: null,
    receiptText: "",
    driveUrl: null,
    channel: "",
    status: "Pendiente",
    controllerName: "Gaby Agos",
    notes: "  ",
  });

  assert.equal(parsed.amount, null);
  assert.equal(parsed.paidOn, null);
  assert.equal(parsed.channel, null);
  assert.equal(parsed.notes, null);
  assert.equal(parsed.status, "PENDING");
  assert.equal(parsed.chargedOn, "2026-10-01");
  assert.equal(parsed.monthLabel, "10 - octubre");
  assert.equal(parsed.year, 2026);
});

test("treats a link comprobante as a Drive file and keeps an observation", () => {
  const parsed = parseLegacyThirdTimeRow({
    legacyRow: 181,
    playerName: "Agustina Domínguez",
    categoryCode: "9na",
    amount: 25000,
    excelChargedOn: 46143,
    excelPaidOn: 46146,
    receiptText: "link",
    driveUrl: driveReceipt,
    channel: "Otro",
    status: "Exento",
    controllerName: "Natalia Palladino",
    notes: "Incluye pago de la hna",
  });

  assert.equal(parsed.receiptReference, null);
  assert.equal(parsed.driveFileId, "1Z_eZuf0euDkM5gAubkoAlnqTBHV1qrjz");
  assert.equal(parsed.status, "EXEMPT");
  assert.equal(parsed.notes, "Incluye pago de la hna");
  assert.equal(parsed.amount, "25000.00");
});

test("rejects an unknown estado", () => {
  assert.throws(
    () =>
      parseLegacyThirdTimeRow({
        legacyRow: 9,
        playerName: "Fabiana, Bravo",
        categoryCode: "9na",
        amount: 20000,
        excelChargedOn: 46054,
        excelPaidOn: null,
        receiptText: "",
        driveUrl: null,
        channel: "Otro",
        status: "Baja",
        controllerName: "Natalia Palladino",
        notes: "",
      }),
    /estado/i,
  );
});
