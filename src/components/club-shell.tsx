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
  name,
  image,
}: {
  children: ReactNode;
  role: Role;
  name: string | null;
  image: string | null;
}) {
  return (
    <ClubFrame
      links={linksForRole(role)}
      roleLabel={roleLabels[role]}
      name={name}
      image={image}
      signOut={
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" className="min-h-11 w-full justify-start px-3">
            Cerrar sesión
          </Button>
        </form>
      }
    >
      {children}
    </ClubFrame>
  );
}
