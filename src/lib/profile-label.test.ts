import assert from "node:assert/strict";
import { test } from "node:test";
import { profileInitials } from "./profile-label.ts";

test("a missing or blank name uses the club initials", () => {
  assert.equal(profileInitials(null), "ST");
  assert.equal(profileInitials(undefined), "ST");
  assert.equal(profileInitials(""), "ST");
  assert.equal(profileInitials("   "), "ST");
});

test("one word uses its first two characters", () => {
  assert.equal(profileInitials("Ana"), "AN");
  assert.equal(profileInitials("A"), "A");
});

test("two or more words use the first letter of the first two", () => {
  assert.equal(profileInitials("Ana Pérez"), "AP");
  assert.equal(profileInitials("Ana  María  López"), "AM");
});
