"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AVATAR_CROP_OUTPUT_PX,
  AVATAR_CROP_VIEWPORT_PX,
  baseCoverScale,
  clampPan,
  renderSquareAvatarBlob,
  withZoom,
  type AvatarCropTransform,
} from "@/lib/avatar-crop";
import { cn } from "cn";

export function PlayerAvatarCropper({
  file,
  previewUrl,
  onCancel,
  onConfirm,
  pending = false,
}: {
  file: File;
  previewUrl: string;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
  pending?: boolean;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [transform, setTransform] = useState<AvatarCropTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [previewUrlRound, setPreviewUrlRound] = useState<string | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!loaded || !image) {
      return;
    }

    const scale = baseCoverScale(image.naturalWidth, image.naturalHeight, AVATAR_CROP_VIEWPORT_PX);
    setTransform(clampPan(image.naturalWidth, image.naturalHeight, scale, AVATAR_CROP_VIEWPORT_PX, 0, 0));
    setZoom(1);
  }, [loaded, previewUrl]);

  useEffect(() => {
    const image = imageRef.current;
    if (!loaded || !image) {
      return;
    }

    let cancelled = false;

    void renderSquareAvatarBlob(
      image,
      transform,
      AVATAR_CROP_VIEWPORT_PX,
      96,
      file.type,
    ).then((blob) => {
      if (cancelled) {
        return;
      }
      const url = URL.createObjectURL(blob);
      setPreviewUrlRound((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return url;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [file.type, loaded, transform]);

  useEffect(() => {
    return () => {
      if (previewUrlRound) {
        URL.revokeObjectURL(previewUrlRound);
      }
    };
  }, [previewUrlRound]);

  function updateZoom(nextZoom: number) {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    setZoom(nextZoom);
    setTransform((current) =>
      withZoom(
        image.naturalWidth,
        image.naturalHeight,
        AVATAR_CROP_VIEWPORT_PX,
        nextZoom,
        current.offsetX,
        current.offsetY,
      ),
    );
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!loaded) {
      return;
    }

    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: transform.offsetX,
      offsetY: transform.offsetY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const image = imageRef.current;
    if (!drag || !image) {
      return;
    }

    const offsetX = drag.offsetX + (event.clientX - drag.x);
    const offsetY = drag.offsetY + (event.clientY - drag.y);
    setTransform(
      clampPan(
        image.naturalWidth,
        image.naturalHeight,
        transform.scale,
        AVATAR_CROP_VIEWPORT_PX,
        offsetX,
        offsetY,
      ),
    );
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  async function handleConfirm() {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const blob = await renderSquareAvatarBlob(
      image,
      transform,
      AVATAR_CROP_VIEWPORT_PX,
      AVATAR_CROP_OUTPUT_PX,
      file.type,
    );
    onConfirm(new File([blob], file.name, { type: file.type, lastModified: Date.now() }));
  }

  const width = imageRef.current ? imageRef.current.naturalWidth * transform.scale : 0;
  const height = imageRef.current ? imageRef.current.naturalHeight * transform.scale : 0;
  const left = (AVATAR_CROP_VIEWPORT_PX - width) / 2 + transform.offsetX;
  const top = (AVATAR_CROP_VIEWPORT_PX - height) / 2 + transform.offsetY;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Arrastrá para encuadrar. El avatar es cuadrado (1:1).
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className="relative mx-auto touch-none sm:mx-0"
          style={{ width: AVATAR_CROP_VIEWPORT_PX, height: AVATAR_CROP_VIEWPORT_PX }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="absolute inset-0 overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={previewUrl}
              alt=""
              draggable={false}
              onLoad={() => setLoaded(true)}
              className={cn("absolute max-w-none select-none", !loaded && "opacity-0")}
              style={{
                width,
                height,
                left,
                top,
              }}
            />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-card"
          />
        </div>
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <span className="text-xs font-medium text-muted-foreground">Vista previa</span>
          <div className="size-24 overflow-hidden rounded-full ring-2 ring-primary/20">
            {previewUrlRound ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrlRound} alt="" className="size-full object-cover" />
            ) : (
              <div className="size-full bg-muted motion-safe:animate-pulse" />
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Alejar"
          disabled={zoom <= 1 || pending}
          onClick={() => updateZoom(Math.max(1, Number((zoom - 0.1).toFixed(2))))}
        >
          <ZoomOut aria-hidden="true" />
        </Button>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          disabled={!loaded || pending}
          aria-label="Zoom"
          className="min-w-0 flex-1"
          onChange={(event) => updateZoom(Number(event.currentTarget.value))}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Acercar"
          disabled={zoom >= 3 || pending}
          onClick={() => updateZoom(Math.min(3, Number((zoom + 0.1).toFixed(2))))}
        >
          <ZoomIn aria-hidden="true" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="min-h-10 px-3" disabled={pending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" className="min-h-10 px-3" disabled={!loaded || pending} onClick={() => void handleConfirm()}>
          {pending ? "Subiendo…" : "Usar recorte"}
        </Button>
      </div>
    </div>
  );
}
