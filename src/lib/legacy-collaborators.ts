import { legacyCollaboratorRows } from "./legacy-collaborators-data.ts";

export type CollaboratorKind = "COORDINATOR" | "THIRD_TIME" | "SPONSOR" | "SPECIAL_CASH";

export type CollaboratorStatus = "ACTIVE" | "INACTIVE";

export type LegacyCollaborator = {
  legacyId: number;
  displayName: string;
  kind: CollaboratorKind;
  categoryCode: string | null;
  status: CollaboratorStatus;
  statusChangedOn: string | null;
};

export const legacyCollaborators: LegacyCollaborator[] = legacyCollaboratorRows.map((row) => ({
  legacyId: row.legacyId,
  displayName: row.displayName,
  kind: row.kind,
  categoryCode: row.categoryCode,
  status: row.status,
  statusChangedOn: row.statusChangedOn,
}));
