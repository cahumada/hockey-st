import { Suspense } from "react";
import { RosterBoard } from "@/components/roster-board";
import type { PlayerCardData } from "@/components/player-card";
import type { PlayerRosterFormData } from "@/components/player-roster-modal";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import { formatPlayerAge } from "@/lib/player-details";
import { maskedStoredDni, loadFieldEncryptionKeyFromEnv } from "@/lib/player-dni-display";
import { playerPortraitSrc } from "@/lib/player-portrait";
import { formatRosterDate, groupPlayersByCategory } from "@/lib/roster";

async function PlayersPanel() {
  await requireAccess("manage-roster");

  const fieldEncryptionKey = loadFieldEncryptionKeyFromEnv();
  const [categories, rows] = await Promise.all([
    prisma.category.findMany(),
    prisma.player.findMany({
      include: { user: { select: { image: true } } },
    }),
  ]);

  const rosterRecords: PlayerRosterFormData[] = rows.map((player) => ({
    id: player.id,
    legacyId: player.legacyId,
    displayName: player.displayName,
    givenName: player.givenName,
    familyName: player.familyName,
    categoryCode: player.categoryCode,
    rosterStatus: player.rosterStatus,
    statusReason: player.statusReason,
    statusChangedOn: player.statusChangedOn ? formatRosterDate(player.statusChangedOn) : null,
    portraitSrc: playerPortraitSrc({
      id: player.id,
      avatarPath: player.avatarPath,
      googleImage: player.user?.image ?? null,
    }),
    birthDate: player.birthDate ? formatRosterDate(player.birthDate) : null,
    membershipNumber: player.membershipNumber,
    jerseyNumber: player.jerseyNumber,
    joinedOn: player.joinedOn ? formatRosterDate(player.joinedOn) : null,
    dniMasked: maskedStoredDni(player.dniCiphertext, fieldEncryptionKey),
  }));

  const players: PlayerCardData[] = rosterRecords.map((player) => ({
    id: player.id,
    legacyId: player.legacyId,
    displayName: player.displayName,
    givenName: player.givenName,
    familyName: player.familyName,
    categoryCode: player.categoryCode,
    rosterStatus: player.rosterStatus,
    statusReason: player.statusReason,
    statusChangedOn: player.statusChangedOn,
    portraitSrc: player.portraitSrc,
    ageLabel: player.birthDate ? formatPlayerAge(player.birthDate) : null,
    membershipNumber: player.membershipNumber,
    jerseyNumber: player.jerseyNumber,
    joinedOnLabel: player.joinedOn ? formatJoinedLabel(player.joinedOn) : null,
    dniMasked: player.dniMasked,
  }));

  const groups = groupPlayersByCategory(categories, players);

  return (
    <RosterBoard
      groups={groups}
      rosterRecords={rosterRecords}
      dniStorageReady={fieldEncryptionKey !== null}
    />
  );
}

function formatJoinedLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function PlayersFallback() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-40 rounded-lg bg-muted motion-safe:animate-pulse" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {["s1", "s2", "s3", "s4", "s5", "s6"].map((id) => (
          <li key={id} className="aspect-square rounded-2xl bg-muted motion-safe:animate-pulse" />
        ))}
      </ul>
    </div>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<PlayersFallback />}>
      <PlayersPanel />
    </Suspense>
  );
}
