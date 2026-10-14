"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { PlayerAvatarCropper } from "@/components/player-avatar-cropper";
import { submitUpdatePlayerAvatar, type RosterActionState } from "@/app/(protected)/players/actions";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { validateAvatarFile } from "@/lib/player-portrait";
import { cn } from "cn";

export type PlayerAvatarTarget = {
  id: string;
  displayName: string;
  legacyId: number;
  portraitSrc: string;
};

const idleAction: RosterActionState = { status: "idle", message: "" };

export function PlayerAvatarModal({
  open,
  player,
  onClose,
}: {
  open: boolean;
  player: PlayerAvatarTarget | null;
  onClose: () => void;
}) {
  const [avatarState, setAvatarState] = useState(idleAction);
  const [pending, startUpload] = useTransition();
  const [cropSession, setCropSession] = useState<{ file: File; previewUrl: string } | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setAvatarState(idleAction);
      setPickError(null);
      setCropSession((current) => {
        if (current) {
          URL.revokeObjectURL(current.previewUrl);
        }
        return null;
      });
    }
  }, [open, player?.id]);

  useEffect(() => {
    if (avatarState.status === "saved") {
      router.refresh();
      onClose();
    }
  }, [avatarState.status, onClose, router]);

  if (!player) {
    return null;
  }

  function clearCropSession() {
    setCropSession((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });
  }

  function uploadCroppedAvatar(cropped: File) {
    if (pending || !player) {
      return;
    }

    const formData = new FormData();
    formData.set("playerId", player.id);
    formData.append("avatar", cropped, cropped.name);

    startUpload(() => {
      void submitUpdatePlayerAvatar(formData).then(setAvatarState);
    });
    clearCropSession();
  }

  return (
    <Modal
      open={open}
      title="Foto de perfil"
      description={`${player.displayName} · Legajo ${player.legacyId}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <Button type="button" variant="outline" className="min-h-11 gap-2 px-4" onClick={onClose}>
            <X aria-hidden="true" />
            Cerrar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={player.portraitSrc}
            alt=""
            width={80}
            height={80}
            referrerPolicy="no-referrer"
            className="size-20 shrink-0 rounded-full object-cover ring-2 ring-primary/15"
          />
          <p className="text-sm text-muted-foreground">
            Elegí una imagen JPEG, PNG o WebP de hasta 5 MB. Vas a poder encuadrarla en un recorte
            cuadrado 1:1 antes de subirla.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) {
              return;
            }

            const verdict = validateAvatarFile({ type: file.type, size: file.size });
            if (!verdict.ok) {
              setPickError(verdict.message);
              return;
            }

            setPickError(null);
            clearCropSession();
            setCropSession({ file, previewUrl: URL.createObjectURL(file) });
          }}
        />

        {!cropSession ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-fit gap-2 px-4"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload aria-hidden="true" />
            Elegir imagen
          </Button>
        ) : (
          <PlayerAvatarCropper
            file={cropSession.file}
            previewUrl={cropSession.previewUrl}
            pending={pending}
            onCancel={clearCropSession}
            onConfirm={uploadCroppedAvatar}
          />
        )}

        {pickError ? (
          <p className="text-sm text-destructive" role="alert">
            {pickError}
          </p>
        ) : null}
        <AvatarNote state={avatarState} />
      </div>
    </Modal>
  );
}

function AvatarNote({ state }: { state: RosterActionState }) {
  if (!state.message || state.status === "saved") {
    return null;
  }

  return (
    <p aria-live="polite" className={cn("text-sm", state.status === "error" && "text-destructive")}>
      {state.message}
    </p>
  );
}
