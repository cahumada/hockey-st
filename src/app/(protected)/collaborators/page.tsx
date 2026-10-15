import { Suspense } from "react";
import {
  CollaboratorBoard,
  type CollaboratorAccountOption,
  type CollaboratorBoardPerson,
  type CollaboratorCategoryOption,
} from "@/components/collaborator-board";
import { accessFor } from "@/lib/access";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import { formatCategoryLabel, formatRosterDate } from "@/lib/roster";

async function CollaboratorsPanel() {
  const session = await requireAccess("manage-collaborators");
  const canAssignRoles = accessFor(session.role, "assign-roles").allowed;

  const [categories, collaborators, users] = await Promise.all([
    prisma.category.findMany({ orderBy: { description: "asc" } }),
    prisma.collaborator.findMany({
      orderBy: { legacyId: "asc" },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        collaboratorProfile: { select: { id: true } },
      },
    }),
  ]);

  const categoryOptions: CollaboratorCategoryOption[] = categories.map((category) => ({
    code: category.code,
    description: category.description,
  }));

  const people: CollaboratorBoardPerson[] = collaborators.map((collaborator) => ({
    id: collaborator.id,
    legacyId: collaborator.legacyId,
    displayName: collaborator.displayName,
    kind: collaborator.kind,
    categoryCode: collaborator.categoryCode,
    categoryLabel: collaborator.category
      ? formatCategoryLabel(collaborator.category)
      : "Sin categoría",
    status: collaborator.status,
    statusChangedOn: collaborator.statusChangedOn
      ? formatRosterDate(collaborator.statusChangedOn)
      : null,
    statusDateLabel: collaborator.statusChangedOn
      ? formatStatusDate(collaborator.statusChangedOn)
      : null,
    accountLabel: collaborator.user ? accountLabel(collaborator.user) : "Sin cuenta",
    role: collaborator.user?.role ?? null,
    userId: collaborator.userId,
  }));

  const accounts: CollaboratorAccountOption[] = users.map((user) => ({
    id: user.id,
    label: accountLabel(user),
    linkedCollaboratorId: user.collaboratorProfile?.id ?? null,
  }));

  return (
    <CollaboratorBoard
      collaborators={people}
      categories={categoryOptions}
      accounts={accounts}
      canAssignRoles={canAssignRoles}
    />
  );
}

function accountLabel(user: { id: string; name: string | null; email: string | null }): string {
  const name = user.name?.trim() ?? "";
  if (name.length > 0) {
    return name;
  }

  const email = user.email?.trim() ?? "";
  if (email.length > 0) {
    return email;
  }

  return user.id;
}

function formatStatusDate(value: Date): string {
  const [year, month, day] = formatRosterDate(value).split("-");
  return `${day}/${month}/${year}`;
}

function CollaboratorsFallback() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-48 rounded-lg bg-muted motion-safe:animate-pulse" />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
        {["s1", "s2", "s3", "s4"].map((id) => (
          <li key={id} className="h-44 rounded-2xl bg-muted motion-safe:animate-pulse" />
        ))}
      </ul>
      <div className="hidden h-64 rounded-xl bg-muted motion-safe:animate-pulse lg:block" />
    </div>
  );
}

export default function CollaboratorsPage() {
  return (
    <Suspense fallback={<CollaboratorsFallback />}>
      <CollaboratorsPanel />
    </Suspense>
  );
}
