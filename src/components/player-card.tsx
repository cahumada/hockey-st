"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  changeRosterStatus,
  updatePlayer,
  type RosterActionState,
} from "@/app/(protected)/players/actions";
import {
  rosterInactiveReasons,
  type RosterCategory,
  type RosterInactiveReason,
  type RosterStatus,
} from "@/lib/roster";

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
};

const idleAction: RosterActionState = { status: "idle", message: "" };

const reasonLabels: Record<RosterInactiveReason, string> = {
  TEMPORARY: "Temporal",
  INJURY: "Lesión",
  PERMANENT: "Permanente",
};

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";

export function PlayerCard({
  player,
  categories,
}: {
  player: PlayerCardData;
  categories: readonly RosterCategory[];
}) {
  const [profileState, saveProfile, profilePending] = useActionState(
    updatePlayer,
    idleAction,
  );
  const [statusState, saveStatus, statusPending] = useActionState(
    changeRosterStatus,
    idleAction,
  );
  const inactive = player.rosterStatus === "INACTIVE";
  const splitName = [player.givenName, player.familyName].filter(Boolean).join(" ");

  return (
    <article className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium">{player.displayName}</h3>
          <p className="text-muted-foreground">
            {splitName || "Sin nombre y apellido"} · Legajo {player.legacyId}
          </p>
        </div>
        <p className={inactive ? "text-destructive" : "text-muted-foreground"}>
          {inactive ? "Inactiva" : "Activa"}
          {inactive && player.statusReason ? ` · ${reasonLabels[player.statusReason]}` : ""}
          {player.statusChangedOn ? ` · ${player.statusChangedOn}` : ""}
        </p>
      </div>

      <details className="mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium">
          Editar
        </summary>
        <form action={saveProfile} className="mt-3 flex flex-col gap-3">
          <input type="hidden" name="playerId" value={player.id} />
          <Field
            id={`display-${player.id}`}
            name="displayName"
            label="Nombre para mostrar"
            defaultValue={player.displayName}
            error={profileState.errors?.displayName}
            required
          />
          <Field
            id={`given-${player.id}`}
            name="givenName"
            label="Nombre"
            defaultValue={player.givenName ?? ""}
            error={profileState.errors?.givenName}
          />
          <Field
            id={`family-${player.id}`}
            name="familyName"
            label="Apellido"
            defaultValue={player.familyName ?? ""}
            error={profileState.errors?.familyName}
          />
          <label className="flex flex-col gap-1" htmlFor={`category-${player.id}`}>
            Categoría
            <select
              id={`category-${player.id}`}
              name="categoryCode"
              defaultValue={player.categoryCode}
              className={fieldClass}
              aria-invalid={profileState.errors?.categoryCode ? true : undefined}
            >
              {categories.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.code} · {category.description}
                </option>
              ))}
            </select>
            <FieldError message={profileState.errors?.categoryCode} />
          </label>
          <ActionNote state={profileState} />
          <Button type="submit" className="min-h-11 px-4" disabled={profilePending}>
            {profilePending ? "Guardando…" : "Guardar"}
          </Button>
        </form>
        <form action={saveStatus} className="mt-6 flex flex-col gap-3 border-t pt-4">
        <input type="hidden" name="playerId" value={player.id} />
        <label className="flex flex-col gap-1" htmlFor={`reason-${player.id}`}>
          Baja
          <select
            id={`reason-${player.id}`}
            name="reason"
            defaultValue={player.statusReason ?? "TEMPORARY"}
            className={fieldClass}
            disabled={statusPending}
          >
            {rosterInactiveReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reasonLabels[reason]}
              </option>
            ))}
          </select>
        </label>
        <ActionNote state={statusState} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="submit"
            name="intent"
            value="deactivate"
            variant="destructive"
            className="min-h-11 px-4"
            disabled={statusPending}
          >
            {inactive ? "Actualizar baja" : "Dar de baja"}
          </Button>
          {inactive ? (
            <Button
              type="submit"
              name="intent"
              value="reactivate"
              variant="outline"
              className="min-h-11 px-4"
              disabled={statusPending}
            >
              Reactivar
            </Button>
          ) : null}
        </div>
      </form>
      </details>
    </article>
  );
}

function Field({
  id,
  name,
  label,
  defaultValue,
  error,
  required = false,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      {label}
      <input
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={fieldClass}
        aria-invalid={error ? true : undefined}
      />
      <FieldError message={error} />
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <span className="text-destructive">{message}</span>;
}

function ActionNote({ state }: { state: RosterActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p aria-live="polite" className={state.status === "error" ? "text-destructive" : ""}>
      {state.message}
    </p>
  );
}
