"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const ModalLayerContext = createContext<HTMLElement | null>(null);

export function useModalLayer(): HTMLElement | null {
  return useContext(ModalLayerContext);
}

export function Modal({
  open,
  title,
  description,
  portrait,
  onClose,
  children,
  footer,
  headerClose = false,
  className,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  portrait?: { src: string; alt: string };
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  headerClose?: boolean;
  className?: string;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dismissRef = useRef(false);
  const [layer, setLayer] = useState<HTMLElement | null>(null);

  function requestClose() {
    dismissRef.current = true;
    onClose();
  }

  useEffect(() => {
    setLayer(dialogRef.current);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (!open) {
      if (dialog.open) {
        dismissRef.current = true;
        dialog.close();
      }
      return;
    }

    dismissRef.current = false;
    (dialog as HTMLDialogElement & { closedBy?: "any" | "closerequest" | "none" }).closedBy = "none";
    if (!dialog.open) {
      dialog.showModal();
    }

    const element = dialog;
    function reopenIfDismissedByNestedUi() {
      queueMicrotask(() => {
        if (!dismissRef.current && !element.open) {
          element.showModal();
        }
      });
    }

    dialog.addEventListener("close", reopenIfDismissedByNestedUi);
    return () => {
      dismissRef.current = true;
      dialog.removeEventListener("close", reopenIfDismissedByNestedUi);
    };
  }, [open]);

  return (
    <ModalLayerContext.Provider value={layer}>
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
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || event.defaultPrevented) {
          return;
        }
        const target = event.target;
        if (
          target instanceof Element &&
          target.closest("[data-slot='select-content'], [data-slot='popover-content']")
        ) {
          return;
        }
        event.preventDefault();
        requestClose();
      }}
    >
      <div
        className="flex min-h-full items-end justify-center p-4 sm:items-center"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            requestClose();
          }
        }}
      >
        <div
          role="document"
          style={{
            maxHeight: wide ? "min(92dvh, 960px)" : "min(90dvh, 720px)",
            ["--modal-body-max" as string]: footer
              ? wide
                ? "calc(min(92dvh, 960px) - 14rem)"
                : "calc(min(90dvh, 720px) - 14rem)"
              : wide
                ? "calc(min(92dvh, 960px) - 8rem)"
                : "calc(min(90dvh, 720px) - 8rem)",
          }}
          className={cn(
            "flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl",
            wide ? "max-w-3xl" : "max-w-lg",
          )}
        >
          <header className="flex shrink-0 items-center gap-4 border-b border-border/70 px-5 py-4">
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
            {headerClose ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Cerrar"
                className="min-h-11 min-w-11 shrink-0"
                onClick={requestClose}
              >
                <X aria-hidden="true" />
              </Button>
            ) : null}
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full max-h-(--modal-body-max) [&_[data-slot=scroll-area-viewport]]:max-h-(--modal-body-max) [&_[data-slot=scroll-area-viewport]]:overscroll-contain">
              <div className="px-5 py-4">{children}</div>
            </ScrollArea>
          </div>
          {footer ? (
            <footer className="shrink-0 border-t border-border/70 bg-card px-5 py-4">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
    </dialog>
    </ModalLayerContext.Provider>
  );
}
