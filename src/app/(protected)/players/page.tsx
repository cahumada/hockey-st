import { Suspense } from "react";
import { PlayerCard, type PlayerCardData } from "@/components/player-card";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import { formatRosterDate, groupPlayersByCategory } from "@/lib/roster";

async function PlayersPanel() {
  await requireAccess("manage-roster");

  const [categories, rows] = await Promise.all([
    prisma.category.findMany(),
    prisma.player.findMany(),
  ]);
  const players: PlayerCardData[] = rows.map((player) => ({
    id: player.id,
    legacyId: player.legacyId,
    displayName: player.displayName,
    givenName: player.givenName,
    familyName: player.familyName,
    categoryCode: player.categoryCode,
    rosterStatus: player.rosterStatus,
    statusReason: player.statusReason,
    statusChangedOn: player.statusChangedOn ? formatRosterDate(player.statusChangedOn) : null,
  }));
  const groups = groupPlayersByCategory(categories, players);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-medium">Jugadoras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agrupadas por categoría. El nombre para mostrar se mantiene hasta guardar nombre y apellido.
        </p>
      </header>
      <nav aria-label="Categorías">
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {groups.map((group) => (
            <li key={group.category.code}>
              <a
                href={`#category-${group.category.code}`}
                className="inline-flex min-h-11 items-center rounded-lg bg-muted px-3 text-sm font-medium"
              >
                {group.category.code}
                <span className="ml-2 text-muted-foreground">{group.players.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {groups.map((group) => (
        <section key={group.category.code} id={`category-${group.category.code}`} className="flex flex-col gap-3">
          <h2 className="text-base font-medium">
            {group.category.code} · {group.category.description}
          </h2>
          {group.players.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay jugadoras.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {group.players.map((player) => (
                <li
                  key={`${player.id}:${player.displayName}:${player.givenName}:${player.familyName}:${player.categoryCode}:${player.rosterStatus}:${player.statusReason}:${player.statusChangedOn}`}
                >
                  <PlayerCard player={player} categories={categories} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<p>Cargando jugadoras…</p>}>
      <PlayersPanel />
    </Suspense>
  );
}
