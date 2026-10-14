"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, UserMinus, X } from "lucide-react";
import { changeRosterStatus, type RosterActionState } from "@/app/(protected)/players/actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { rosterInactiveReasons, type RosterInactiveReason, type RosterStatus } from "@/lib/roster";
import { cn } from "cn";

export type PlayerStatusTarget = {
  id: string;
  displayName: string;
  legacyId: number;
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

export function PlayerRosterStatusModal({
  open,
  player,
  onClose,
}: {
  open: boolean;
  player: PlayerStatusTarget | null;
  onClose: () => void;
}) {
  const [statusState, saveStatus, statusPending] = useActionState(changeRosterStatus, idleAction);
  const router = useRouter();
  const statusFormRef = useRef<HTMLFormElement>(null);
  const intentRef = useRef<HTMLInputElement>(null);
  const inactive = player?.rosterStatus === "INACTIVE";

  function submitStatus(intent: "deactivate" | "reactivate") {
    if (!intentRef.current || !statusFormRef.current) {
      return;
    }

    intentRef.current.value = intent;
    statusFormRef.current.requestSubmit();
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    if (statusState.status === "saved") {
      router.refresh();
      onClose();
    }
  }, [open, statusState.status, router, onClose]);

  if (!player) {
    return null;
  }

  return (
    <Modal
      open={open}
      title={inactive ? "Estado de baja" : "Dar de baja"}
      description={`${player.displayName} · Legajo ${player.legacyId}`}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="min-h-11 gap-2 px-4" onClick={onClose}>
            <X aria-hidden="true" />
            Cancelar
          </Button>
          {inactive ? (
            <>
              <Button
                type="button"
                variant="destructive"
                className="min-h-11 gap-2 px-4"
                disabled={statusPending}
                onClick={() => submitStatus("deactivate")}
              >
                <UserMinus aria-hidden="true" />
                {statusPending ? "Guardando…" : "Actualizar baja"}
              </Button>
              <Button
                type="button"
                variant="default"
                className="min-h-11 gap-2 px-4"
                disabled={statusPending}
                onClick={() => submitStatus("reactivate")}
              >
                <RotateCcw aria-hidden="true" />
                Reactivar
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              className="min-h-11 gap-2 px-4"
              disabled={statusPending}
              onClick={() => submitStatus("deactivate")}
            >
              <UserMinus aria-hidden="true" />
              {statusPending ? "Guardando…" : "Confirmar baja"}
            </Button>
          )}
        </div>
      }
    >
      {inactive && player.statusChangedOn ? (
        <p className="mb-3 text-sm text-muted-foreground">
          Baja desde {player.statusChangedOn}
          {player.statusReason ? ` · ${reasonLabels[player.statusReason]}` : ""}
        </p>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">
          Elegí el motivo. Podés reactivarla más adelante desde la misma opción en la ficha.
        </p>
      )}

      <form ref={statusFormRef} action={saveStatus} className="flex flex-col gap-3">
        <input type="hidden" name="playerId" value={player.id} />
        <input ref={intentRef} type="hidden" name="intent" defaultValue="deactivate" />
        <label className="flex flex-col gap-1" htmlFor="status-reason">
          Motivo de baja
          <select
            id="status-reason"
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
      </form>
    </Modal>
  );
}

function ActionNote({ state }: { state: RosterActionState }) {
  if (!state.message || state.status === "saved") {
    return null;
  }

  return (
    <p aria-live="polite" className={cn(state.status === "error" && "text-destructive")}>
      {state.message}
    </p>
  );
}
