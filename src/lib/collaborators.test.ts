import assert from "node:assert/strict";
import { test } from "node:test";
import {
  nextCollaboratorLegacyId,
  parseCollaboratorAssignment,
  parseCollaboratorLink,
  parseCollaboratorProfile,
  thirdTimeCollaboratorKinds,
} from "./collaborators.ts";

test("3er Tiempo only assigns coordinators and third-time collaborators", () => {
  assert.deepEqual(thirdTimeCollaboratorKinds, ["COORDINATOR", "THIRD_TIME"]);
});

test("a new collaborator takes the next legacy id", () => {
  assert.equal(nextCollaboratorLegacyId(null), 1);
  assert.equal(nextCollaboratorLegacyId(10), 11);
});

test("assignment accepts a kind with an empty category", () => {
  assert.deepEqual(
    parseCollaboratorAssignment({ kind: "COORDINATOR", categoryCode: "" }, ["9na", "PS"]),
    { ok: true, kind: "COORDINATOR", categoryCode: null },
  );
});

test("assignment accepts a kind with an allowed category", () => {
  assert.deepEqual(
    parseCollaboratorAssignment({ kind: "THIRD_TIME", categoryCode: "9na" }, ["9na", "PS"]),
    { ok: true, kind: "THIRD_TIME", categoryCode: "9na" },
  );
});

test("assignment rejects an unknown kind", () => {
  const parsed = parseCollaboratorAssignment({ kind: "entrenador", categoryCode: "" }, ["9na"]);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.message, "Elegí un tipo de colaborador.");
  }
});

test("assignment rejects an unknown category", () => {
  const parsed = parseCollaboratorAssignment(
    { kind: "THIRD_TIME", categoryCode: "missing" },
    ["9na"],
  );
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.message, "Elegí una categoría.");
  }
});

test("link accepts a user id with the administrator role", () => {
  assert.deepEqual(parseCollaboratorLink({ userId: "user_1", role: "ADMINISTRATOR" }), {
    ok: true,
    unlink: false,
    userId: "user_1",
    role: "ADMINISTRATOR",
  });
});

test("an empty user id unlinks the account", () => {
  assert.deepEqual(parseCollaboratorLink({ userId: "", role: "ADMINISTRATOR" }), {
    ok: true,
    unlink: true,
  });
});

test("profile keeps a trimmed name, kind, empty category, and clears the date when active", () => {
  assert.deepEqual(
    parseCollaboratorProfile(
      {
        displayName: "  Anabella  ",
        givenName: "  Ana  ",
        familyName: "  Gómez  ",
        kind: "COORDINATOR",
        categoryCode: "",
        status: "ACTIVE",
        statusChangedOn: "2026-09-01",
      },
      ["9na"],
    ),
    {
      ok: true,
      displayName: "Anabella",
      givenName: "Ana",
      familyName: "Gómez",
      kind: "COORDINATOR",
      categoryCode: null,
      status: "ACTIVE",
      statusChangedOn: null,
    },
  );
});

test("profile keeps an inactive collaborator with a calendar date", () => {
  assert.deepEqual(
    parseCollaboratorProfile(
      {
        displayName: "Rosana",
        givenName: "Rosana",
        familyName: "Lavagnino",
        kind: "THIRD_TIME",
        categoryCode: "7ma",
        status: "INACTIVE",
        statusChangedOn: "2026-09-01",
      },
      ["7ma"],
    ),
    {
      ok: true,
      displayName: "Rosana",
      givenName: "Rosana",
      familyName: "Lavagnino",
      kind: "THIRD_TIME",
      categoryCode: "7ma",
      status: "INACTIVE",
      statusChangedOn: "2026-09-01",
    },
  );
});

test("profile rejects a blank name, an unknown status, and an inactive row without a real date", () => {
  const blank = parseCollaboratorProfile(
    {
      displayName: "   ",
      givenName: "   ",
      familyName: "   ",
      kind: "SPONSOR",
      categoryCode: "",
      status: "ACTIVE",
      statusChangedOn: "",
    },
    [],
  );
  assert.equal(blank.ok, false);
  if (!blank.ok) {
    assert.equal(blank.message, "Ingresá el alias de este colaborador.");
  }

  const namesOptional = parseCollaboratorProfile(
    {
      displayName: "Malena",
      givenName: "",
      familyName: " ",
      kind: "SPECIAL_CASH",
      categoryCode: "",
      status: "ACTIVE",
      statusChangedOn: "",
    },
    [],
  );
  assert.equal(namesOptional.ok, true);
  if (namesOptional.ok) {
    assert.equal(namesOptional.displayName, "Malena");
    assert.equal(namesOptional.givenName, null);
    assert.equal(namesOptional.familyName, null);
  }

  const status = parseCollaboratorProfile(
    {
      displayName: "Malena Ruiz",
      givenName: "Malena",
      familyName: "Ruiz",
      kind: "SPECIAL_CASH",
      categoryCode: "",
      status: "baja",
      statusChangedOn: "",
    },
    [],
  );
  assert.equal(status.ok, false);
  if (!status.ok) {
    assert.equal(status.message, "Elegí un estado.");
  }

  const missingDate = parseCollaboratorProfile(
    {
      displayName: "Pablo Bellemans",
      givenName: "Pablo",
      familyName: "Bellemans",
      kind: "SPONSOR",
      categoryCode: "",
      status: "INACTIVE",
      statusChangedOn: "2026-02-31",
    },
    [],
  );
  assert.equal(missingDate.ok, false);
  if (!missingDate.ok) {
    assert.equal(missingDate.message, "Indicá la fecha del estado.");
  }
});

test("link rejects an invalid role", () => {
  const parsed = parseCollaboratorLink({ userId: "user_1", role: "capitan" });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.message, "Elegí un rol.");
  }
});
