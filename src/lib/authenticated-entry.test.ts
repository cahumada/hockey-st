import assert from "node:assert/strict";
import { test } from "node:test";
import { entryPathForUser } from "./authenticated-entry.ts";

test("a non-empty user id enters the dashboard", () => {
  assert.equal(entryPathForUser("user-1"), "/dashboard");
});

test("a missing or empty user id has no entry path", () => {
  assert.equal(entryPathForUser(null), null);
  assert.equal(entryPathForUser(undefined), null);
  assert.equal(entryPathForUser(""), null);
});
