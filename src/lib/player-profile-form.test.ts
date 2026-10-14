import assert from "node:assert/strict";
import { test } from "node:test";
import {
  dniStorageUnavailableMessage,
  validatePlayerProfileFormValues,
} from "./player-profile-form.ts";

test("validatePlayerProfileFormValues blocks DNI when storage is unavailable", () => {
  const result = validatePlayerProfileFormValues(
    {
      displayName: "Ana Test",
      givenName: "",
      familyName: "",
      categoryCode: "7ma",
      birthDate: "",
      membershipNumber: "",
      jerseyNumber: "",
      dni: "30123456",
      joinedOn: "",
    },
    ["7ma"],
    { dniStorageReady: false },
  );

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.equal(result.errors.dni, dniStorageUnavailableMessage);
});

test("validatePlayerProfileFormValues allows empty DNI without storage", () => {
  const result = validatePlayerProfileFormValues(
    {
      displayName: "Ana Test",
      givenName: "",
      familyName: "",
      categoryCode: "7ma",
      birthDate: "",
      membershipNumber: "",
      jerseyNumber: "",
      dni: "",
      joinedOn: "",
    },
    ["7ma"],
    { dniStorageReady: false },
  );

  assert.equal(result.ok, true);
});
