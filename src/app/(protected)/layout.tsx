import { Suspense } from "react";
import { ClubShell } from "@/components/club-shell";
import { requireSession } from "@/lib/require-access";

async function ProtectedFrame({ children }: { children: React.ReactNode }) {
  const { role } = await requireSession();
  return <ClubShell role={role}>{children}</ClubShell>;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<p className="w-full px-4 py-6">Loading account…</p>}>
      <ProtectedFrame>{children}</ProtectedFrame>
    </Suspense>
  );
}
