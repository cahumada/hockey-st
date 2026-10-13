import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/auth";
import { linksForRole } from "@/components/capability-links";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/access";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

const navLinkClass =
  "inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-medium";

export function ClubShell({
  children,
  role,
}: {
  children: ReactNode;
  role: Role;
}) {
  const links = linksForRole(role);

  return (
    <div className="flex min-h-full w-full flex-col">
      <header className="flex w-full items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-base font-medium">Club Atlético San Telmo</p>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="min-h-11 px-4">
            Sign out
          </Button>
        </form>
      </header>
      <main className="w-full flex-1 px-4 pt-6 pb-28">{children}</main>
      <nav
        aria-label="Account"
        className="fixed inset-x-0 bottom-0 border-t bg-background pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex gap-1 overflow-x-auto px-4 py-2">
          <li>
            <Link className={navLinkClass} href="/account">
              Account
            </Link>
          </li>
          {links.map((link) => (
            <li key={link.href}>
              <Link className={navLinkClass} href={link.href}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
