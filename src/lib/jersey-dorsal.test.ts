import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatJerseyDorsalNumber,
  jerseyDorsalDarkSrc,
  jerseyDorsalLightSrc,
} from "./jersey-dorsal.ts";

test("jersey dorsal assets are published under brand", () => {
  assert.equal(jerseyDorsalLightSrc, "/brand/jersey-dorsal.jpg");
  assert.equal(jerseyDorsalDarkSrc, "/brand/jersey-dorsal-dark.png");
});

test("formatJerseyDorsalNumber stringifies the roster number", () => {
  assert.equal(formatJerseyDorsalNumber(9), "9");
  assert.equal(formatJerseyDorsalNumber(42), "42");
});
