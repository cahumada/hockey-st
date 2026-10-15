"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import {
  nextCollaboratorLegacyId,
  parseCollaboratorLink,
  parseCollaboratorProfile,
} from "@/lib/collaborators";

export type CollaboratorActionState = {
  status: "idle" | "saved" | "error";
  message: string;
};

export async function createCollaborator(
  _previous: CollaboratorActionState,
  formData: FormData,
): Promise<CollaboratorActionState> {
  await requireAccess("manage-collaborators");

  const categories = await prisma.category.findMany({ select: { code: true } });
  const parsed = parseCollaboratorProfile(
    {
      displayName: text(formData, "displayName"),
      kind: text(formData, "kind"),
      categoryCode: text(formData, "categoryCode"),
      status: text(formData, "status"),
      statusChangedOn: text(formData, "statusChangedOn"),
    },
    categories.map((category) => category.code),
  );
  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  const maxLegacy = await prisma.collaborator.aggregate({ _max: { legacyId: true } });
  const legacyId = nextCollaboratorLegacyId(maxLegacy._max.legacyId);

  try {
    await prisma.collaborator.create({
      data: {
        legacyId,
        displayName: parsed.displayName,
        kind: parsed.kind,
        categoryCode: parsed.categoryCode,
        status: parsed.status,
        statusChangedOn: parsed.statusChangedOn
          ? new Date(`${parsed.statusChangedOn}T00:00:00.000Z`)
          : null,
      },
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { status: "error", message: "No se pudo asignar el legajo. Intentá de nuevo." };
    }
    throw error;
  }

  revalidatePath("/collaborators");
  return { status: "saved", message: "Colaborador creado." };
}

export async function updateCollaboratorProfile(
  _previous: CollaboratorActionState,
  formData: FormData,
): Promise<CollaboratorActionState> {
  await requireAccess("manage-collaborators");

  const collaboratorId = text(formData, "collaboratorId");
  if (collaboratorId.length === 0) {
    return { status: "error", message: "No se encontró el colaborador." };
  }

  const categories = await prisma.category.findMany({ select: { code: true } });
  const parsed = parseCollaboratorProfile(
    {
      displayName: text(formData, "displayName"),
      kind: text(formData, "kind"),
      categoryCode: text(formData, "categoryCode"),
      status: text(formData, "status"),
      statusChangedOn: text(formData, "statusChangedOn"),
    },
    categories.map((category) => category.code),
  );
  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  try {
    await prisma.collaborator.update({
      where: { id: collaboratorId },
      data: {
        displayName: parsed.displayName,
        kind: parsed.kind,
        categoryCode: parsed.categoryCode,
        status: parsed.status,
        statusChangedOn: parsed.statusChangedOn
          ? new Date(`${parsed.statusChangedOn}T00:00:00.000Z`)
          : null,
      },
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return { status: "error", message: "No se encontró el colaborador." };
    }
    throw error;
  }

  revalidatePath("/collaborators");
  return { status: "saved", message: "Datos guardados." };
}

export async function updateCollaboratorLink(
  _previous: CollaboratorActionState,
  formData: FormData,
): Promise<CollaboratorActionState> {
  await requireAccess("assign-roles");

  const collaboratorId = text(formData, "collaboratorId");
  if (collaboratorId.length === 0) {
    return { status: "error", message: "No se encontró el colaborador." };
  }

  const parsed = parseCollaboratorLink({
    userId: text(formData, "userId"),
    role: text(formData, "role"),
  });
  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  const collaborator = await prisma.collaborator.findUnique({
    where: { id: collaboratorId },
    select: { id: true },
  });
  if (!collaborator) {
    return { status: "error", message: "No se encontró el colaborador." };
  }

  if (parsed.unlink) {
    try {
      await prisma.collaborator.update({
        where: { id: collaboratorId },
        data: { userId: null },
      });
    } catch (error) {
      if (isMissingRecord(error)) {
        return { status: "error", message: "No se encontró el colaborador." };
      }
      throw error;
    }

    revalidatePath("/collaborators");
    return { status: "saved", message: "Cuenta desvinculada." };
  }

  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { id: true },
  });
  if (!user) {
    return { status: "error", message: "No se encontró la cuenta." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const taken = await tx.collaborator.findFirst({
        where: {
          userId: parsed.userId,
          id: { not: collaboratorId },
        },
        select: { id: true },
      });
      if (taken) {
        throw new LinkTakenError();
      }

      await tx.collaborator.update({
        where: { id: collaboratorId },
        data: { userId: parsed.userId },
      });
      await tx.user.update({
        where: { id: parsed.userId },
        data: { role: parsed.role },
      });
    });
  } catch (error) {
    if (error instanceof LinkTakenError || isUniqueConflict(error)) {
      return { status: "error", message: "Esa cuenta ya está vinculada a otra persona." };
    }
    if (isMissingRecord(error)) {
      return { status: "error", message: "No se encontró el colaborador." };
    }
    throw error;
  }

  revalidatePath("/collaborators");
  return { status: "saved", message: "Cuenta vinculada." };
}

class LinkTakenError extends Error {
  constructor() {
    super("Esa cuenta ya está vinculada a otra persona.");
    this.name = "LinkTakenError";
  }
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isMissingRecord(error: unknown): boolean {
  return prismaCode(error) === "P2025";
}

function isUniqueConflict(error: unknown): boolean {
  return prismaCode(error) === "P2002";
}

function prismaCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : null;
  }
  return null;
}
