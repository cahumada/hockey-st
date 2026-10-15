"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  nextCatalogLegacyId,
  parseCatalogEntry,
  type CatalogStatus,
} from "@/lib/maintenance-catalog";
import { requireAccess } from "@/lib/require-access";

export type MaintenanceCatalogActionState = {
  status: "idle" | "saved" | "error";
  message: string;
};

const expenseTypesPath = "/maintenance/expense-types";
const incomeTypesPath = "/maintenance/income-types";

export async function createExpenseType(
  _previous: MaintenanceCatalogActionState,
  formData: FormData,
): Promise<MaintenanceCatalogActionState> {
  return createCatalogEntry(formData, {
    path: expenseTypesPath,
    savedMessage: "Tipo de gasto creado.",
    allocateLegacyId: async () => {
      const maxLegacy = await prisma.expenseType.aggregate({ _max: { legacyId: true } });
      return nextCatalogLegacyId(maxLegacy._max.legacyId);
    },
    insert: (data) => prisma.expenseType.create({ data }),
  });
}

export async function updateExpenseType(
  _previous: MaintenanceCatalogActionState,
  formData: FormData,
): Promise<MaintenanceCatalogActionState> {
  return updateCatalogEntry(formData, expenseTypesPath, (id, data) =>
    prisma.expenseType.update({ where: { id }, data }),
  );
}

export async function createIncomeType(
  _previous: MaintenanceCatalogActionState,
  formData: FormData,
): Promise<MaintenanceCatalogActionState> {
  return createCatalogEntry(formData, {
    path: incomeTypesPath,
    savedMessage: "Tipo de ingreso creado.",
    allocateLegacyId: async () => {
      const maxLegacy = await prisma.incomeType.aggregate({ _max: { legacyId: true } });
      return nextCatalogLegacyId(maxLegacy._max.legacyId);
    },
    insert: (data) => prisma.incomeType.create({ data }),
  });
}

export async function updateIncomeType(
  _previous: MaintenanceCatalogActionState,
  formData: FormData,
): Promise<MaintenanceCatalogActionState> {
  return updateCatalogEntry(formData, incomeTypesPath, (id, data) =>
    prisma.incomeType.update({ where: { id }, data }),
  );
}

async function createCatalogEntry(
  formData: FormData,
  options: {
    path: string;
    savedMessage: string;
    allocateLegacyId: () => Promise<number>;
    insert: (data: {
      legacyId: number;
      description: string;
      status: CatalogStatus;
    }) => Promise<unknown>;
  },
): Promise<MaintenanceCatalogActionState> {
  await requireAccess("manage-maintenance");

  const parsed = parseCatalogEntry({
    description: text(formData, "description"),
    status: text(formData, "status"),
  });
  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  const legacyId = await options.allocateLegacyId();

  try {
    await options.insert({
      legacyId,
      description: parsed.description,
      status: parsed.status,
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      return { status: "error", message: "No se pudo asignar el número. Intentá de nuevo." };
    }
    throw error;
  }

  revalidatePath(options.path);
  return { status: "saved", message: options.savedMessage };
}

async function updateCatalogEntry(
  formData: FormData,
  path: string,
  update: (
    id: string,
    data: { description: string; status: CatalogStatus },
  ) => Promise<unknown>,
): Promise<MaintenanceCatalogActionState> {
  await requireAccess("manage-maintenance");

  const id = text(formData, "id");
  if (id.length === 0) {
    return { status: "error", message: "No se encontró el tipo." };
  }

  const parsed = parseCatalogEntry({
    description: text(formData, "description"),
    status: text(formData, "status"),
  });
  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }

  try {
    await update(id, {
      description: parsed.description,
      status: parsed.status,
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return { status: "error", message: "No se encontró el tipo." };
    }
    throw error;
  }

  revalidatePath(path);
  return { status: "saved", message: "Datos guardados." };
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
