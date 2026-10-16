import type { ParsedLegacyThirdTime } from "./legacy-third-time.ts";

export type LegacyThirdTimePlayerRef = {
  id: string;
  displayName: string;
  categoryCode: string;
  legacyId?: number;
};

export type LegacyThirdTimeRosterRef = {
  legacyId: number;
  displayName: string;
  categoryCode: string;
};

export type LegacyThirdTimeCollaboratorRef = {
  id: string;
  displayName: string;
};

export function resolveLegacyThirdTime(
  fee: ParsedLegacyThirdTime,
  players: readonly LegacyThirdTimePlayerRef[],
  collaborators: readonly LegacyThirdTimeCollaboratorRef[],
  legacyRoster: readonly LegacyThirdTimeRosterRef[] = [],
):
  | { ok: true; playerId: string; controllerId: string }
  | { ok: false; reason: string } {
  const player = findPlayer(fee, players, legacyRoster);
  if (!player) {
    return {
      ok: false,
      reason: `Jugadora desconocida: ${fee.playerName} (${fee.categoryCode})`,
    };
  }

  const controller = collaborators.find(
    (candidate) => candidate.displayName === fee.controllerName,
  );
  if (!controller) {
    return { ok: false, reason: `Control desconocido: ${fee.controllerName}` };
  }

  return { ok: true, playerId: player.id, controllerId: controller.id };
}

function findPlayer(
  fee: ParsedLegacyThirdTime,
  players: readonly LegacyThirdTimePlayerRef[],
  legacyRoster: readonly LegacyThirdTimeRosterRef[],
): LegacyThirdTimePlayerRef | undefined {
  const current = players.find(
    (candidate) =>
      candidate.displayName === fee.playerName && candidate.categoryCode === fee.categoryCode,
  );
  if (current) return current;

  const roster = legacyRoster.find(
    (candidate) =>
      candidate.displayName === fee.playerName && candidate.categoryCode === fee.categoryCode,
  );
  if (!roster) return undefined;
  return players.find((candidate) => candidate.legacyId === roster.legacyId);
}
