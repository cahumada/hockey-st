"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { profileInitials } from "@/lib/profile-label";

export function ProfileMenu({
  name,
  image,
  signOut,
}: {
  name: string | null;
  image: string | null;
  signOut: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const label = name && name.trim() !== "" ? `Menú de ${name}` : "Menú de perfil";

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root || !(event.target instanceof Node) || root.contains(event.target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        className="min-h-11 min-w-11 rounded-full p-0"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        {image ? (
          <Image
            src={image}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          profileInitials(name)
        )}
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-1 min-w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <Link
            href="/account"
            role="menuitem"
            className="flex min-h-11 w-full items-center justify-start rounded-lg px-3 text-sm font-medium hover:bg-muted"
            onClick={() => setOpen(false)}
          >
            Perfil
          </Link>
          {signOut}
        </div>
      ) : null}
    </div>
  );
}
