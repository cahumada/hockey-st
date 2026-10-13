import assert from "node:assert/strict";
import { test } from "node:test";
import { accessFor, type Capability } from "./access.ts";

const capabilities: Capability[] = [
  "club-dashboard",
  "register-movements",
  "assign-roles",
  "club-report",
  "parent-report",
];

test("administrator can open every club capability at full scope", () => {
  assert.deepEqual(accessFor("ADMINISTRATOR", "club-dashboard"), {
    allowed: true,
    scope: "all",
  });
  assert.deepEqual(accessFor("ADMINISTRATOR", "register-movements"), {
    allowed: true,
    scope: "all",
  });
  assert.deepEqual(accessFor("ADMINISTRATOR", "assign-roles"), {
    allowed: true,
    scope: "all",
  });
  assert.deepEqual(accessFor("ADMINISTRATOR", "club-report"), {
    allowed: true,
    scope: "all",
  });
  assert.deepEqual(accessFor("ADMINISTRATOR", "parent-report"), {
    allowed: true,
    scope: "all",
  });
});

test("coordinator can operate the club but cannot assign roles", () => {
  assert.deepEqual(accessFor("COORDINATOR", "club-dashboard"), {
    allowed: true,
    scope: "all",
  });
  assert.deepEqual(accessFor("COORDINATOR", "register-movements"), {
    allowed: true,
    scope: "all",
  });
  assert.equal(accessFor("COORDINATOR", "assign-roles").allowed, false);
  assert.deepEqual(accessFor("COORDINATOR", "club-report"), {
    allowed: true,
    scope: "all",
  });
  assert.deepEqual(accessFor("COORDINATOR", "parent-report"), {
    allowed: true,
    scope: "all",
  });
});

test("collaborator registers movements and sees only their own dashboard", () => {
  assert.deepEqual(accessFor("COLLABORATOR", "club-dashboard"), {
    allowed: true,
    scope: "own",
  });
  assert.deepEqual(accessFor("COLLABORATOR", "register-movements"), {
    allowed: true,
    scope: "all",
  });
  for (const capability of ["assign-roles", "club-report", "parent-report"] as const) {
    assert.equal(accessFor("COLLABORATOR", capability).allowed, false);
  }
});

test("player and visitor cannot open club or parent-report routes", () => {
  for (const role of ["PLAYER", "VISITOR"] as const) {
    for (const capability of capabilities) {
      assert.deepEqual(accessFor(role, capability), { allowed: false });
    }
  }
});

test("parent tutor can open only the linked parent report", () => {
  assert.deepEqual(accessFor("PARENT", "parent-report"), {
    allowed: true,
    scope: "linked",
  });
  for (const capability of capabilities) {
    if (capability === "parent-report") continue;
    assert.equal(accessFor("PARENT", capability).allowed, false);
  }
});
