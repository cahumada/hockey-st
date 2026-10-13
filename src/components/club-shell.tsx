import type { ReactNode } from "react";
import { signOut } from "@/auth";
import { linksForRole, roleLabels } from "@/components/capability-links";
import { ClubFrame } from "@/components/club-frame";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/access";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export function ClubShell({
  children,
  role,
}: {
  children: ReactNode;
  role: Role;
}) {
  return (
    <ClubFrame
      links={linksForRole(role)}
      roleLabel={roleLabels[role]}
      signOut={
        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="min-h-11 px-4">
            Sign out
          </Button>
        </form>
      }
    >
      {children}
    </ClubFrame>
  );
}
