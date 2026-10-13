"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ProfileMenu } from "@/components/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

const desktopQuery = "(min-width: 768px)";

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function desktopSnapshot() {
  return window.matchMedia(desktopQuery).matches;
}

function subscribeMounted() {
  return () => {};
}

function Crest({ alt }: { alt: string }) {
  return (
    <Image
      src="/brand/san-telmo-crest.webp"
      alt={alt}
      width={40}
      height={48}
      className="h-12 w-10 shrink-0"
    />
  );
}

export function ClubFrame({
  links,
  roleLabel,
  name,
  image,
  signOut,
  children,
}: {
  links: { href: string; label: string }[];
  roleLabel: string;
  name: string | null;
  image: string | null;
  signOut: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const isDesktop = useSyncExternalStore(subscribeDesktop, desktopSnapshot, () => false);
  const drawer = open && !isDesktop;

  useEffect(() => {
    const media = window.matchMedia(desktopQuery);
    const onChange = () => {
      if (media.matches) setOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawer]);

  useEffect(() => {
    if (!drawer) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [
        ...sidebar.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (
        event.shiftKey &&
        (active === first || active === sidebar || !sidebar.contains(active))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !sidebar.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawer]);

  useEffect(() => {
    if (!drawer) return;
    const menu = menuRef.current;
    sidebarRef.current?.focus();
    return () => {
      menu?.focus();
    };
  }, [drawer]);

  return (
    <div className="flex min-h-dvh w-full bg-background">
      {drawer ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <nav
        ref={sidebarRef}
        id="club-sidebar"
        aria-label="Menú"
        role={drawer ? "dialog" : undefined}
        aria-modal={drawer ? true : undefined}
        tabIndex={drawer ? -1 : undefined}
        inert={mounted && !isDesktop && !open ? true : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r bg-sidebar text-sidebar-foreground shadow-lg transition",
          open ? "translate-x-0" : "-translate-x-full",
          "md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 md:shadow-none",
        )}
      >
        <div className="flex items-center gap-3 px-3 py-4">
          <Crest alt="Club Atlético San Telmo" />
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight">San Telmo</p>
            <p className="text-sm text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <ul className="flex flex-col">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center border-l-2 px-3 text-sm font-medium",
                    active
                      ? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
                      : "border-transparent text-sidebar-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 bg-background pt-[env(safe-area-inset-top)]">
          <div aria-hidden="true" className="h-[3px] w-full bg-[oklch(0.688_0.141_232.6)]" />
          <div className="flex h-14 items-center justify-between border-b bg-background/95 px-3 backdrop-blur">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                ref={menuRef}
                type="button"
                variant="outline"
                className="min-h-11 min-w-11 px-0 md:hidden"
                aria-label={open ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={open}
                aria-controls="club-sidebar"
                onClick={() => setOpen((current) => !current)}
              >
                {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              </Button>
              <div className="flex min-w-0 items-center gap-2 md:hidden">
                <Crest alt="" />
                <span className="truncate text-sm font-semibold">San Telmo</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <ProfileMenu name={name} image={image} signOut={signOut} />
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
