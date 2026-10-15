import assert from "node:assert/strict";
import { test } from "node:test";
import { legacyCollaborators } from "./legacy-collaborators.ts";
import { legacyCategories } from "./legacy-roster.ts";

test("colaboradores load keeps the sheet name, kind, category, and status", () => {
  assert.equal(legacyCollaborators.length, 10);
  assert.deepEqual(
    legacyCollaborators.map((collaborator) => collaborator.legacyId),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.deepEqual(legacyCollaborators, [
    {
      legacyId: 1,
      displayName: "Anabella",
      kind: "COORDINATOR",
      categoryCode: null,
      status: "ACTIVE",
      statusChangedOn: null,
    },
    {
      legacyId: 2,
      displayName: "Natalia Palladino",
      kind: "THIRD_TIME",
      categoryCode: "9na",
      status: "ACTIVE",
      statusChangedOn: null,
    },
    {
      legacyId: 3,
      displayName: "Gaby Agos",
      kind: "THIRD_TIME",
      categoryCode: "8va",
      status: "ACTIVE",
      statusChangedOn: null,
    },
    {
      legacyId: 4,
      displayName: "Rosana Lavagnino",
      kind: "THIRD_TIME",
      categoryCode: "7ma",
      status: "INACTIVE",
      statusChangedOn: "2026-09-01",
    },
    {
      legacyId: 5,
      displayName: "Norma Rivero",
      kind: "THIRD_TIME",
      categoryCode: "7ma",
      status: "ACTIVE",
      statusChangedOn: null,
    },
    {
      legacyId: 6,
      displayName: "Elena Molina",
      kind: "THIRD_TIME",
      categoryCode: "5ta",
      status: "ACTIVE",
      statusChangedOn: null,
    },
    {
      legacyId: 7,
      displayName: "Clarisa",
      kind: "THIRD_TIME",
      categoryCode: "PS",
      status: "ACTIVE",
      statusChangedOn: null,
    },
    {
      legacyId: 8,
      displayName: "Fernanda Largosta",
      kind: "THIRD_TIME",
      categoryCode: "6ta",
      status: "ACTIVE",
      statusChangedOn: null,
    },
    {
      legacyId: 9,
      displayName: "Pablo Bellemans",
      kind: "SPONSOR",
      categoryCode: null,
      status: "INACTIVE",
      statusChangedOn: "2026-06-01",
    },
    {
      legacyId: 10,
      displayName: "Malena",
      kind: "SPECIAL_CASH",
      categoryCode: null,
      status: "ACTIVE",
      statusChangedOn: null,
    },
  ]);

  const codes = new Set(legacyCategories.map((category) => category.code));
  for (const collaborator of legacyCollaborators) {
    assert.ok(collaborator.displayName.trim().length > 0);
    assert.equal(collaborator.displayName, collaborator.displayName.trim());
    if (collaborator.categoryCode !== null) {
      assert.ok(codes.has(collaborator.categoryCode));
    }
  }
});
