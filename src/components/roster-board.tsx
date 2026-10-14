"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { PlayerCard, type PlayerCardData } from "@/components/player-card";
import { PlayerAvatarModal } from "@/components/player-avatar-modal";
import { PlayerRosterModal, type PlayerRosterFormData } from "@/components/player-roster-modal";
import { PlayerRosterStatusModal } from "@/components/player-roster-status-modal";
import { Button } from "@/components/ui/button";
import { browseRoster, type RosterBrowseStatus } from "@/lib/roster-browse";
import type { RosterCategory } from "@/lib/roster";
import { cn } from "cn";

type RosterGroup = {
  category: RosterCategory;
  players: readonly PlayerCardData[];
};

const fieldClass =
  "h-11 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";

const statusOptions: { value: RosterBrowseStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "inactive", label: "Bajas" },
];

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; playerId: string }
  | null;

export function RosterBoard({
  groups,
  rosterRecords,
  dniStorageReady,
}: {
  groups: readonly RosterGroup[];
  rosterRecords: readonly PlayerRosterFormData[];
  dniStorageReady: boolean;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<RosterBrowseStatus>("all");
  const [categoryCode, setCategoryCode] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [statusPlayerId, setStatusPlayerId] = useState<string | null>(null);
  const [avatarPlayerId, setAvatarPlayerId] = useState<string | null>(null);
  const categories = useMemo(() => groups.map((group) => group.category), [groups]);
  const recordsById = useMemo(
    () => new Map(rosterRecords.map((record) => [record.id, record])),
    [rosterRecords],
  );
  const result = useMemo(() => {
    const browsed = browseRoster(groups, { text, status, categoryCode });

    if (
      categoryCode !== null &&
      !browsed.categories.some((category) => category.code === categoryCode)
    ) {
      return browseRoster(groups, { text, status, categoryCode: null });
    }

    return browsed;
  }, [groups, text, status, categoryCode]);
  const selectedCategory =
    categoryCode !== null && result.categories.some((category) => category.code === categoryCode)
      ? categoryCode
      : null;
  const categoryTotal = result.categories.reduce((sum, category) => sum + category.count, 0);
  const categoryStillListed =
    categoryCode === null ||
    result.categories.some((category) => category.code === categoryCode);
  const modalPlayer =
    modal?.mode === "edit" ? recordsById.get(modal.playerId) ?? null : null;
  const modalOpen = modal !== null && (modal.mode === "create" || modalPlayer !== null);
  const showRosterModal = modal !== null && (modal.mode === "create" || modalPlayer !== null);
  const statusPlayer = statusPlayerId ? recordsById.get(statusPlayerId) ?? null : null;
  const avatarPlayer = avatarPlayerId ? recordsById.get(avatarPlayerId) ?? null : null;

  if (!categoryStillListed) {
    setCategoryCode(null);
  }

  function clearFilters() {
    setText("");
    setStatus("all");
    setCategoryCode(null);
  }

  return (
    <div className="flex flex-col">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jugadoras</h1>
          <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
            {rosterSummary(result.totals)}
          </p>
        </div>
        <Button type="button" className="min-h-11 shrink-0 px-4" onClick={() => setModal({ mode: "create" })}>
          Nueva jugadora
        </Button>
      </header>
      <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="roster-search">
            Buscar
            <input
              id="roster-search"
              type="search"
              value={text}
              placeholder="Nombre o legajo"
              autoComplete="off"
              onChange={(event) => setText(event.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <fieldset className="flex shrink-0 items-center gap-2 border-0 p-0">
              <legend className="sr-only">Estado</legend>
              {statusOptions.map((option) => (
                <FilterButton
                  key={option.value}
                  pressed={status === option.value}
                  onClick={() => setStatus(option.value)}
                >
                  {option.label}
                </FilterButton>
              ))}
            </fieldset>
            <span aria-hidden="true" className="h-6 w-px shrink-0 bg-border" />
            <nav aria-label="Categorías" className="shrink-0">
              <ul className="flex flex-nowrap gap-2">
                <li className="shrink-0">
                  <FilterButton
                    pressed={selectedCategory === null}
                    onClick={() => setCategoryCode(null)}
                  >
                    Todas
                    <Count selected={selectedCategory === null}>{categoryTotal}</Count>
                  </FilterButton>
                </li>
                {result.categories.map((category) => {
                  const selected = selectedCategory === category.code;

                  return (
                    <li key={category.code} className="shrink-0">
                      <FilterButton
                        pressed={selected}
                        onClick={() => setCategoryCode(category.code)}
                      >
                        {category.code}
                        <Count selected={selected}>{category.count}</Count>
                      </FilterButton>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      </div>
      <div className="pt-4">
        {result.groups.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p>No hay jugadoras con ese filtro.</p>
            <Button type="button" className="min-h-11 px-4" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 motion-safe:animate-in motion-safe:fade-in sm:grid-cols-3 lg:grid-cols-4">
            {result.groups.map((group, index) => (
              <Fragment key={group.category.code}>
                <li className={cn("col-span-full", index > 0 && "pt-4")}>
                  <h2 className="flex items-baseline gap-2 text-base font-semibold">
                    <span aria-hidden="true" className="inline-block h-4 w-1 self-center rounded-full bg-primary" />
                    <span>{group.category.code}</span>
                    <span className="font-normal text-muted-foreground">
                      {group.category.description}
                    </span>
                  </h2>
                </li>
                {group.players.map((player) => (
                  <li key={player.id} className="min-w-0">
                    <PlayerCard
                      player={player}
                      onEdit={() => setModal({ mode: "edit", playerId: player.id })}
                      onChangePhoto={() => setAvatarPlayerId(player.id)}
                      onManageStatus={() => setStatusPlayerId(player.id)}
                    />
                  </li>
                ))}
              </Fragment>
            ))}
          </ul>
        )}
      </div>
      {showRosterModal && modal ? (
        <PlayerRosterModal
          key={modal.mode === "edit" ? modal.playerId : "create"}
          open={modalOpen}
          mode={modal.mode}
          player={modal.mode === "edit" ? modalPlayer : null}
          categories={categories}
          dniStorageReady={dniStorageReady}
          onClose={() => setModal(null)}
          onSaved={() => setModal(null)}
        />
      ) : null}
      <PlayerRosterStatusModal
        open={statusPlayer !== null}
        player={statusPlayer}
        onClose={() => setStatusPlayerId(null)}
      />
      <PlayerAvatarModal
        open={avatarPlayer !== null}
        player={
          avatarPlayer
            ? {
                id: avatarPlayer.id,
                displayName: avatarPlayer.displayName,
                legacyId: avatarPlayer.legacyId,
                portraitSrc: avatarPlayer.portraitSrc,
              }
            : null
        }
        onClose={() => setAvatarPlayerId(null)}
      />
    </div>
  );
}

function FilterButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        pressed ? "bg-primary text-primary-foreground" : "bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Count({ selected, children }: { selected: boolean; children: ReactNode }) {
  return (
    <span className={cn("ml-2", selected ? "text-primary-foreground" : "text-muted-foreground")}>
      {children}
    </span>
  );
}

function rosterSummary(totals: { shown: number; active: number; inactive: number }): string {
  return [
    countLabel(totals.shown, "jugadora", "jugadoras"),
    countLabel(totals.active, "activa", "activas"),
    countLabel(totals.inactive, "baja", "bajas"),
  ].join(" · ");
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
