import assert from "node:assert/strict";
import { test } from "node:test";
import { formatPlayerAge, parseOptionalProfile, playerAgeYears } from "./player-details.ts";

test("parseOptionalProfile accepts blank optional fields", () => {
  assert.deepEqual(
    parseOptionalProfile({
      birthDate: "",
      membershipNumber: "",
      jerseyNumber: "",
      dni: "",
      joinedOn: "",
    }),
    {
      ok: true,
      value: {
        birthDate: null,
        membershipNumber: null,
        jerseyNumber: null,
        dniNormalized: null,
        joinedOn: null,
      },
    },
  );
});

test("playerAgeYears uses the club calendar day", () => {
  assert.equal(playerAgeYears("2010-03-15", "2026-03-14"), 15);
  assert.equal(playerAgeYears("2010-03-15", "2026-03-15"), 16);
  assert.equal(formatPlayerAge("2010-03-15", "2026-03-15"), "16 años");
});

test("parseOptionalProfile validates jersey and dni", () => {
  const parsed = parseOptionalProfile({
    birthDate: "2010-01-01",
    membershipNumber: " ST-42 ",
    jerseyNumber: "0",
    dni: "12.345.678",
    joinedOn: "2024-06-01",
  });

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.errors.jerseyNumber, "Usá un número entre 1 y 999.");
  }

  const ok = parseOptionalProfile({
    birthDate: "2010-01-01",
    membershipNumber: " ST-42 ",
    jerseyNumber: "9",
    dni: "12.345.678",
    joinedOn: "2024-06-01",
  });

  assert.deepEqual(ok, {
    ok: true,
    value: {
      birthDate: "2010-01-01",
      membershipNumber: "ST-42",
      jerseyNumber: 9,
      dniNormalized: "12345678",
      joinedOn: "2024-06-01",
    },
  });
});
