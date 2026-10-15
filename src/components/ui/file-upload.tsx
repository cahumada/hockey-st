"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { FileSymlink, FileText, Upload, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

export function FileUpload({
  id,
  label,
  hint,
  accept,
  file,
  onFileChange,
  error,
  existing,
  disabled = false,
  emptyLabel = "Arrastrá un archivo o hacé clic para elegirlo",
}: {
  id: string;
  label?: string;
  hint?: string;
  accept: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
  existing?: { label: string; onView?: () => void; viewLabel?: string };
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const previewUrl = useObjectUrl(file);

  function pick(next: File | null) {
    if (inputRef.current) inputRef.current.value = "";
    onFileChange(next);
  }

  function takeDropped(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    pick(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <span className="text-sm font-medium" id={`${id}-label`}>
          {label}
        </span>
      ) : null}
      {existing && !file ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
          <p className="min-w-0 truncate text-sm">{existing.label}</p>
          {existing.onView ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 shrink-0 gap-2 px-3"
              onClick={existing.onView}
            >
              <FileSymlink aria-hidden="true" />
              {existing.viewLabel ?? "Ver"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="size-16 shrink-0 rounded-lg bg-muted object-cover"
            />
          ) : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
              {existing ? " · reemplaza el archivo guardado" : null}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 shrink-0 px-3"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            Cambiar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Quitar archivo"
            className="min-h-11 min-w-11 shrink-0"
            disabled={disabled}
            onClick={() => pick(null)}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={takeDropped}
          className={cn(
            "flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-5 text-center outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
            dragging ? "border-primary bg-primary/5" : "border-border bg-muted/40 hover:bg-muted",
          )}
        >
          <Upload aria-hidden="true" className="text-muted-foreground" />
          <span className="text-sm font-medium">{emptyLabel}</span>
          {hint ? (
            <span id={`${id}-hint`} className="max-w-sm text-xs font-normal text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </button>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => pick(event.target.files?.[0] ?? null)}
      />
      {file && hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
