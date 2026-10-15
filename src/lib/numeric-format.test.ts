import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatNumericDisplay,
  formatNumericOnBlur,
  numericEditDraft,
  parseNumericDraft,
} from "./numeric-format.ts";

test("parses an Argentine amount and formats it for the field", () => {
  assert.equal(parseNumericDraft("90.000,50"), 90000.5);
  assert.equal(parseNumericDraft("$ 90.000,50"), 90000.5);
  assert.equal(parseNumericDraft("10,"), null);
  assert.equal(formatNumericDisplay(90000.5, "es-AR", 2, 2), "90.000,50");
  assert.equal(numericEditDraft(90000.5, 2), "90000,50");
});

test("applies Argentine format when the amount field loses focus", () => {
  const options = {
    locale: "es-AR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    min: 0,
  };

  assert.deepEqual(formatNumericOnBlur("1500", options), { text: "1.500,00", value: 1500 });
  assert.deepEqual(formatNumericOnBlur("1500,5", options), { text: "1.500,50", value: 1500.5 });
  assert.deepEqual(formatNumericOnBlur("", options), { text: "", value: undefined });
  assert.deepEqual(formatNumericOnBlur("10,", options), { text: "10,", value: undefined });
});
