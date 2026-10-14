import assert from "node:assert/strict";
import { test } from "node:test";
import { baseCoverScale, clampPan, withZoom } from "./avatar-crop.ts";

test("baseCoverScale fills a square viewport", () => {
  assert.equal(baseCoverScale(800, 600, 200), 200 / 600);
  assert.equal(baseCoverScale(400, 400, 200), 0.5);
});

test("clampPan keeps a wide image from showing empty sides", () => {
  const scale = baseCoverScale(1200, 800, 200);
  const clamped = clampPan(1200, 800, scale, 200, 400, 0);
  assert.equal(clamped.offsetX, (1200 * scale - 200) / 2);
  assert.equal(clamped.offsetY, 0);
});

test("withZoom increases scale and reclamps offsets", () => {
  const result = withZoom(1000, 1000, 200, 1.5, 0, 0);
  assert.ok(result.scale > baseCoverScale(1000, 1000, 200));
  assert.equal(result.offsetX, 0);
  assert.equal(result.offsetY, 0);
});
