import assert from "node:assert/strict";
import { test } from "node:test";
import { googleUserSeed } from "./google-profile.ts";

test("google profile seed keeps identity fields and drops any role claim", () => {
  const seed = googleUserSeed({
    sub: "google-subject",
    name: "Ada Parent",
    email: "ada@example.com",
    picture: "https://example.com/ada.png",
    email_verified: true,
    role: "ADMINISTRATOR",
  });

  assert.equal(seed.id, "google-subject");
  assert.equal(seed.name, "Ada Parent");
  assert.equal(seed.email, "ada@example.com");
  assert.equal(seed.image, "https://example.com/ada.png");
  assert.ok(seed.emailVerified instanceof Date);
  assert.equal(Object.hasOwn(seed, "role"), false);
});

test("unverified google profile does not invent a verification date", () => {
  const seed = googleUserSeed({
    sub: "google-subject",
    email_verified: false,
  });

  assert.equal(seed.emailVerified, null);
  assert.equal(Object.hasOwn(seed, "role"), false);
});
