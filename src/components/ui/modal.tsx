"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "cn";

export function Modal({
  open,
  title,
  description,
  portrait,
  onClose,
  children,
  footer,
  className,
}: {
  open: boolean;
  title: string;
  description?: string;
  portrait?: { src: string; alt: string };
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      className={cn(
        "fixed inset-0 z-50 m-0 h-dvh max-h-dvh w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-foreground/40",
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
        <div
          role="document"
          className={cn(
            "grid max-h-[min(90dvh,720px)] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl",
            footer ? "grid-rows-[auto_minmax(0,1fr)_auto]" : "grid-rows-[auto_minmax(0,1fr)]",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex min-h-0 items-center gap-4 border-b border-border/70 px-5 py-4">
            {portrait ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={portrait.src}
                alt={portrait.alt}
                width={56}
                height={56}
                referrerPolicy="no-referrer"
                className="size-14 shrink-0 rounded-full object-cover ring-2 ring-primary/20"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <h2 id="modal-title" className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description ? (
                <p id="modal-description" className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </header>
          <div className="min-h-0 overflow-hidden">
            <ScrollArea className="h-full max-h-full w-full [&_[data-slot=scroll-area-viewport]]:max-h-full">
              <div className="px-5 py-4">{children}</div>
            </ScrollArea>
          </div>
          {footer ? (
            <footer className="relative z-10 border-t border-border/70 bg-card px-5 py-4">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
