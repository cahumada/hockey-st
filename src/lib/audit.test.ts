import assert from "node:assert/strict";
import { test } from "node:test";
import { currentAuditUserId, runWithAuditUser, stampWriteData } from "./audit.ts";

test("leaves writes untouched when nobody is signed in", () => {
  assert.deepEqual(stampWriteData({ displayName: "Ana" }, "create"), { displayName: "Ana" });
});

test("records the signed-in user on create and update", async () => {
  await runWithAuditUser("user-1", async () => {
    assert.deepEqual(stampWriteData({ displayName: "Ana" }, "create"), {
      displayName: "Ana",
      createdById: "user-1",
      updatedById: "user-1",
    });
    assert.deepEqual(stampWriteData([{ amount: "10" }, { amount: "20" }], "create"), [
      { amount: "10", createdById: "user-1", updatedById: "user-1" },
      { amount: "20", createdById: "user-1", updatedById: "user-1" },
    ]);
    assert.deepEqual(stampWriteData({ notes: "editada" }, "update"), {
      notes: "editada",
      updatedById: "user-1",
    });
  });
  assert.equal(currentAuditUserId(), null);
});

test("keeps an actor that was already set", async () => {
  await runWithAuditUser("user-2", async () => {
    assert.deepEqual(
      stampWriteData({ createdById: "user-1", updatedById: "user-1" }, "update"),
      { createdById: "user-1", updatedById: "user-1" },
    );
  });
});

test("keeps the signed-in user across awaits", async () => {
  await runWithAuditUser("user-1", async () => {
    await Promise.resolve();
    assert.equal(currentAuditUserId(), "user-1");
  });
});
