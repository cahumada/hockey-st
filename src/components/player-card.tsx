"use client";

import type { ReactNode } from "react";
import { Archive, Camera, Pencil, UserMinus } from "lucide-react";
import { PlayerJerseyDorsal } from "@/components/player-jersey-dorsal";
import { rosterStatusTone, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { RosterInactiveReason, RosterStatus } from "@/lib/roster";
import { cn } from "cn";

export type PlayerCardData = {
  id: string;
  legacyId: number;
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  categoryCode: string;
  rosterStatus: RosterStatus;
  statusReason: RosterInactiveReason | null;
  statusChangedOn: string | null;
  portraitSrc: string;
  ageLabel: string | null;
  membershipNumber: string | null;
  jerseyNumber: number | null;
  joinedOnLabel: string | null;
  dniMasked: string | null;
};

const notInformedLabel = "no informa";

function formatPlayerLegalName(
  givenName: string | null,
  familyName: string | null,
): string | null {
  const parts = [givenName?.trim(), familyName?.trim()].filter(
    (part): part is string => Boolean(part),
  );

  if (parts.length === 0) {
    return null;
  }

  return parts.join(" ");
}

const reasonLabels: Record<RosterInactiveReason, string> = {
  TEMPORARY: "Temporal",
  INJURY: "Lesión",
  PERMANENT: "Permanente",
};

export function PlayerCard({
  player,
  onEdit,
  onChangePhoto,
  onManageStatus,
}: {
  player: PlayerCardData;
  onEdit: () => void;
  onChangePhoto: () => void;
  onManageStatus: () => void;
}) {
  const inactive = player.rosterStatus === "INACTIVE";
  const legalName = formatPlayerLegalName(player.givenName, player.familyName);

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-[box-shadow,border-color] motion-safe:duration-200",
        "hover:border-primary/25 hover:shadow-md",
        inactive && "border-border/50 bg-muted/40 opacity-95",
      )}
    >
      <div className="relative flex flex-col items-center px-4 pt-4 pb-2 text-center">
        <div className="flex items-center justify-center gap-3">
          <Portrait player={player} onChangePhoto={onChangePhoto} />
          {player.jerseyNumber !== null ? (
            <PlayerJerseyDorsal
              jerseyNumber={player.jerseyNumber}
              avatar
              compact
              backdropClassName="bg-card"
              className="size-16 shrink-0 sm:size-[4.25rem]"
            />
          ) : null}
        </div>
        <div className="mt-3 flex w-full flex-wrap items-center justify-center gap-1.5">
          <CategoryPill code={player.categoryCode} />
          <StatusPill player={player} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 border-t border-border/60 px-4 py-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{player.displayName}</h3>
        <p
          className={cn(
            "line-clamp-2 text-xs leading-snug",
            legalName ? "text-foreground/85" : "text-muted-foreground",
          )}
        >
          {legalName ?? notInformedLabel}
        </p>
        <p className="text-xs text-muted-foreground">Legajo {player.legacyId}</p>
        <dl className="mt-1 flex flex-col gap-1 border-t border-border/50 pt-2">
          <DetailRow label="Edad" value={player.ageLabel} />
          <DetailRow label="DNI" value={player.dniMasked} />
          <DetailRow
            label="Socio"
            value={player.membershipNumber ? player.membershipNumber : null}
          />
          <DetailRow label="Ingreso" value={player.joinedOnLabel} />
          {inactive ? (
            <DetailRow label="Baja" value={player.statusChangedOn} />
          ) : null}
        </dl>
        <div role="group" aria-label="Acciones" className="mt-auto flex justify-center gap-0.5 pt-2">
          <IconAction label="Editar" onClick={onEdit}>
            <Pencil aria-hidden="true" />
          </IconAction>
          <IconAction
            label={inactive ? "Gestionar baja" : "Dar de baja"}
            onClick={onManageStatus}
            tone="danger"
          >
            {inactive ? <Archive aria-hidden="true" /> : <UserMinus aria-hidden="true" />}
          </IconAction>
        </div>
      </div>
    </article>
  );
}

function IconAction({
  label,
  onClick,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <span className="group/icon relative inline-flex">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        onClick={onClick}
        className={cn(
          "size-8 text-muted-foreground shadow-none",
          tone === "default" && "hover:bg-muted/60 hover:text-foreground",
          tone === "danger" && "hover:bg-destructive/10 hover:text-destructive",
        )}
      >
        {children}
      </Button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[0.6875rem] font-medium text-background opacity-0 shadow-sm transition-opacity group-hover/icon:opacity-100 group-focus-within/icon:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  const missing = !value?.trim();
  const display = missing ? notInformedLabel : value;

  return (
    <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] items-baseline gap-x-2 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right font-medium text-foreground",
          missing && "font-normal text-muted-foreground",
        )}
      >
        {display}
      </dd>
    </div>
  );
}

function Portrait({
  player,
  onChangePhoto,
}: {
  player: PlayerCardData;
  onChangePhoto: () => void;
}) {
  return (
    <div className="relative shrink-0">
      {/* next/image cannot send the session cookie to the private avatar route. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={player.portraitSrc}
        alt={`Foto de ${player.displayName}`}
        width={512}
        height={512}
        referrerPolicy="no-referrer"
        className="size-16 rounded-full object-cover shadow-sm ring-2 ring-primary/20 ring-offset-2 ring-offset-card sm:size-[4.25rem]"
      />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Cambiar foto"
        className="absolute -right-0.5 -bottom-0.5 size-8 min-h-8 min-w-8 rounded-full"
        onClick={onChangePhoto}
      >
        <Camera className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}

function CategoryPill({ code }: { code: string }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-primary uppercase">
      {code}
    </span>
  );
}

function StatusPill({ player }: { player: PlayerCardData }) {
  const inactive = player.rosterStatus === "INACTIVE";

  return (
    <StatusBadge tone={rosterStatusTone(player.rosterStatus, player.statusReason)}>
      {inactive ? "Inactiva" : "Activa"}
      {inactive && player.statusReason ? ` · ${reasonLabels[player.statusReason]}` : ""}
    </StatusBadge>
  );
}
