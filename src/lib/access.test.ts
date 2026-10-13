import assert from "node:assert/strict";
import { test } from "node:test";
import { accessFor, type Capability } from "./access.ts";

const capabilities: Capability[] = [
  "club-dashboard",
  "register-movements",
  "assign-roles",
  "club-report",
  "parent-report",
  "manage-roster",
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
  assert.deepEqual(accessFor("ADMINISTRATOR", "manage-roster"), {
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
  assert.deepEqual(accessFor("COORDINATOR", "manage-roster"), {
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
  for (const capability of ["assign-roles", "club-report", "parent-report", "manage-roster"] as const) {
    assert.equal(accessFor("COLLABORATOR", capability).allowed, false);
  }
});

test("player and visitor can open only their own club dashboard", () => {
  for (const role of ["PLAYER", "VISITOR"] as const) {
    assert.deepEqual(accessFor(role, "club-dashboard"), {
      allowed: true,
      scope: "own",
    });
    for (const capability of capabilities) {
      if (capability === "club-dashboard") continue;
      assert.deepEqual(accessFor(role, capability), { allowed: false });
    }
  }
});

test("parent tutor can open the linked parent report and their own club dashboard", () => {
  assert.deepEqual(accessFor("PARENT", "parent-report"), {
    allowed: true,
    scope: "linked",
  });
  assert.deepEqual(accessFor("PARENT", "club-dashboard"), {
    allowed: true,
    scope: "own",
  });
  for (const capability of capabilities) {
    if (capability === "parent-report" || capability === "club-dashboard") continue;
    assert.equal(accessFor("PARENT", capability).allowed, false);
  }
});
