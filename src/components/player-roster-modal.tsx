"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Save, UserPlus, X } from "lucide-react";
import {
  PlayerProfileFormFields,
  usePlayerProfileForm,
} from "@/components/player-profile-form-fields";
import {
  submitCreatePlayer,
  submitUpdatePlayer,
  type RosterActionState,
} from "@/app/(protected)/players/actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { profileValuesToFormData } from "@/lib/player-profile-form";
import type { PlayerProfileFormValues } from "@/lib/player-profile-form";
import { defaultPlayerAvatarSrc } from "@/lib/player-portrait";
import type { RosterCategory, RosterInactiveReason, RosterStatus } from "@/lib/roster";
import { cn } from "cn";

export type PlayerRosterFormData = {
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
  birthDate: string | null;
  membershipNumber: string | null;
  jerseyNumber: number | null;
  joinedOn: string | null;
  dniMasked: string | null;
};

const idleAction: RosterActionState = { status: "idle", message: "" };
const profileFormId = "player-roster-profile-form";

export function PlayerRosterModal({
  open,
  mode,
  player,
  categories,
  dniStorageReady,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  player: PlayerRosterFormData | null;
  categories: readonly RosterCategory[];
  dniStorageReady: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (mode === "edit") {
    if (player === null) {
      return null;
    }

    return (
      <PlayerRosterEditModal
        open={open}
        player={player}
        categories={categories}
        dniStorageReady={dniStorageReady}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  return (
    <PlayerRosterCreateModal
      open={open}
      categories={categories}
      dniStorageReady={dniStorageReady}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function PlayerRosterEditModal({
  open,
  player,
  categories,
  dniStorageReady,
  onClose,
  onSaved,
}: {
  open: boolean;
  player: PlayerRosterFormData;
  categories: readonly RosterCategory[];
  dniStorageReady: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [profileState, setProfileState] = useState(idleAction);
  const [profilePending, startProfileSave] = useTransition();
  const saveProfileRef = useRef<() => void>(() => {});
  const router = useRouter();

  const bindSaveProfile = useCallback((submit: () => void) => {
    saveProfileRef.current = submit;
  }, []);

  useEffect(() => {
    if (!open) {
      setProfileState(idleAction);
    }
  }, [open, player.id]);

  useEffect(() => {
    if (profileState.status === "saved") {
      router.refresh();
      onSaved();
      onClose();
    }
  }, [profileState.status, onClose, onSaved, router]);

  function saveProfileValues(values: PlayerProfileFormValues) {
    if (profilePending) {
      return;
    }

    const formData = profileValuesToFormData(values, player.id);
    startProfileSave(() => {
      void submitUpdatePlayer(formData).then(setProfileState);
    });
  }

  return (
    <Modal
      open={open}
      title={player.displayName}
      description={`Legajo ${player.legacyId}`}
      portrait={{ src: player.portraitSrc, alt: `Foto de ${player.displayName}` }}
      onClose={onClose}
      footer={
        <ProfileFooter
          pending={profilePending}
          onClose={onClose}
          onSave={() => saveProfileRef.current()}
          saveLabel="Guardar cambios"
          saveIcon={<Save aria-hidden="true" />}
        />
      }
    >
      <PlayerProfileSection
        key={player.id}
        formId={profileFormId}
        player={player}
        categories={categories}
        dniStorageReady={dniStorageReady}
        profileState={profileState}
        bindSave={bindSaveProfile}
        onValidSubmit={saveProfileValues}
      />
    </Modal>
  );
}

function PlayerRosterCreateModal({
  open,
  categories,
  dniStorageReady,
  onClose,
  onSaved,
}: {
  open: boolean;
  categories: readonly RosterCategory[];
  dniStorageReady: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [profileState, setProfileState] = useState(idleAction);
  const [profilePending, startProfileSave] = useTransition();
  const saveProfileRef = useRef<() => void>(() => {});
  const router = useRouter();

  const bindSaveProfile = useCallback((submit: () => void) => {
    saveProfileRef.current = submit;
  }, []);

  useEffect(() => {
    if (!open) {
      setProfileState(idleAction);
    }
  }, [open]);

  useEffect(() => {
    if (profileState.status === "saved") {
      router.refresh();
      onSaved();
      onClose();
    }
  }, [profileState.status, onClose, onSaved, router]);

  function saveProfileValues(values: PlayerProfileFormValues) {
    if (profilePending) {
      return;
    }

    const formData = profileValuesToFormData(values);
    startProfileSave(() => {
      void submitCreatePlayer(formData).then(setProfileState);
    });
  }

  return (
    <Modal
      open={open}
      title="Nueva jugadora"
      description="Completá los datos obligatorios. El resto es opcional."
      portrait={{ src: defaultPlayerAvatarSrc, alt: "" }}
      onClose={onClose}
      footer={
        <ProfileFooter
          pending={profilePending}
          onClose={onClose}
          onSave={() => saveProfileRef.current()}
          saveLabel="Crear jugadora"
          saveIcon={<UserPlus aria-hidden="true" />}
        />
      }
    >
      <PlayerProfileSection
        key="create"
        formId={profileFormId}
        player={null}
        categories={categories}
        dniStorageReady={dniStorageReady}
        profileState={profileState}
        bindSave={bindSaveProfile}
        onValidSubmit={saveProfileValues}
      />
    </Modal>
  );
}

function PlayerProfileSection({
  formId,
  player,
  categories,
  dniStorageReady,
  profileState,
  bindSave,
  onValidSubmit,
}: {
  formId: string;
  player: PlayerRosterFormData | null;
  categories: readonly RosterCategory[];
  dniStorageReady: boolean;
  profileState: RosterActionState;
  bindSave: (submit: () => void) => void;
  onValidSubmit: (values: PlayerProfileFormValues) => void;
}) {
  const form = usePlayerProfileForm({
    player,
    categories,
    dniStorageReady,
    serverErrors: profileState.errors,
  });

  const submit = form.handleSubmit(onValidSubmit);

  useEffect(() => {
    bindSave(() => {
      void submit();
    });
  }, [bindSave, submit]);

  return (
    <>
      <PlayerProfileFormFields
        form={form}
        formId={formId}
        player={player}
        categories={categories}
        dniStorageReady={dniStorageReady}
      />
      <ActionNote state={profileState} />
    </>
  );
}

function ProfileFooter({
  pending,
  onClose,
  onSave,
  saveLabel,
  saveIcon,
}: {
  pending: boolean;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  saveIcon: ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" className="min-h-11 gap-2 px-4" onClick={onClose}>
        <X aria-hidden="true" />
        Cancelar
      </Button>
      <Button type="button" className="min-h-11 gap-2 px-4" disabled={pending} onClick={onSave}>
        {saveIcon}
        {pending ? "Guardando…" : saveLabel}
      </Button>
    </div>
  );
}

function ActionNote({ state }: { state: RosterActionState }) {
  if (!state.message || state.status === "saved") {
    return null;
  }

  if (state.errors && Object.keys(state.errors).length > 0) {
    return null;
  }

  return (
    <p aria-live="polite" className={cn("mt-3 text-sm", state.status === "error" && "text-destructive")}>
      {state.message}
    </p>
  );
}
