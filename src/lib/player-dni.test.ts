import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptDni, encryptDni, maskDni, normalizeDni } from "./player-dni.ts";

const key = Buffer.alloc(32, 7);

test("normalizeDni keeps seven or eight digits", () => {
  assert.equal(normalizeDni("12.345.678"), "12345678");
  assert.equal(normalizeDni("1234567"), "1234567");
  assert.equal(normalizeDni("  "), null);
  assert.equal(normalizeDni("123456"), null);
});

test("encrypt and decrypt round-trip a dni", () => {
  const encrypted = encryptDni("30123456", key);
  assert.notEqual(encrypted, "30123456");
  assert.equal(decryptDni(encrypted, key), "30123456");
});

test("maskDni hides all but the last four digits", () => {
  assert.equal(maskDni("30123456"), "•••• 3456");
});
