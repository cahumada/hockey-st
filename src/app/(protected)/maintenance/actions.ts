"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  nextCatalogLegacyId,
  parseCatalogEntry,
  type CatalogStatus,
} from "@/lib/maintenance-catalog";
import { audited } from "@/lib/require-access";

export type MaintenanceCatalogActionState = {
  status: "idle" | "saved" | "error";
  message: string;
};

const expenseTypesPath = "/maintenance/expense-types";
const incomeTypesPath = "/maintenance/income-types";
const channelsPath = "/maintenance/channels";
const thirdTimePath = "/third-time";

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

export async function createThirdTimeChannel(
  _previous: MaintenanceCatalogActionState,
  formData: FormData,
): Promise<MaintenanceCatalogActionState> {
  return createCatalogEntry(formData, {
    path: channelsPath,
    savedMessage: "Canal creado.",
    extraPaths: [thirdTimePath],
    rejectDuplicate: (description) => channelNameTaken(description),
    allocateLegacyId: async () => {
      const maxLegacy = await prisma.thirdTimeChannel.aggregate({ _max: { legacyId: true } });
      return nextCatalogLegacyId(maxLegacy._max.legacyId);
    },
    insert: (data) => prisma.thirdTimeChannel.create({ data }),
  });
}

export async function updateThirdTimeChannel(
  _previous: MaintenanceCatalogActionState,
  formData: FormData,
): Promise<MaintenanceCatalogActionState> {
  return updateCatalogEntry(formData, channelsPath, (id, data) =>
    prisma.thirdTimeChannel.update({ where: { id }, data }),
    {
      extraPaths: [thirdTimePath],
      rejectDuplicate: (description, id) => channelNameTaken(description, id),
      missingMessage: "No se encontró el canal.",
    },
  );
}

export async function deleteThirdTimeChannel(
  previous: MaintenanceCatalogActionState,
  formData: FormData,
): Promise<MaintenanceCatalogActionState> {
  return audited("manage-maintenance", () => deleteThirdTimeChannelRecord(previous, formData));
}

async function deleteThirdTimeChannelRecord(
  _previous: MaintenanceCatalogActionState,
  formData: FormData,
): Promise<MaintenanceCatalogActionState> {
  const id = text(formData, "id");
  if (id.length === 0) {
    return { status: "error", message: "No se encontró el canal." };
  }

  try {
    await prisma.thirdTimeChannel.delete({ where: { id } });
  } catch (error) {
    if (isMissingRecord(error)) {
      return { status: "error", message: "No se encontró el canal." };
    }
    throw error;
  }

  revalidatePath(channelsPath);
  revalidatePath(thirdTimePath);
  return { status: "saved", message: "Canal quitado." };
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
    extraPaths?: readonly string[];
    rejectDuplicate?: (description: string) => Promise<boolean>;
    allocateLegacyId: () => Promise<number>;
    insert: (data: {
      legacyId: number;
      description: string;
      status: CatalogStatus;
    }) => Promise<unknown>;
  },
): Promise<MaintenanceCatalogActionState> {
  return audited("manage-maintenance", () => createCatalogEntryRecord(formData, options));
}

async function createCatalogEntryRecord(
  formData: FormData,
  options: {
    path: string;
    savedMessage: string;
    extraPaths?: readonly string[];
    rejectDuplicate?: (description: string) => Promise<boolean>;
    allocateLegacyId: () => Promise<number>;
    insert: (data: {
      legacyId: number;
      description: string;
      status: CatalogStatus;
    }) => Promise<unknown>;
  },
): Promise<MaintenanceCatalogActionState> {
  const parsed = parseCatalogEntry({
    description: text(formData, "description"),
    status: text(formData, "status"),
  });
  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }
  if (await options.rejectDuplicate?.(parsed.description)) {
    return { status: "error", message: "Ese canal ya existe." };
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
  for (const path of options.extraPaths ?? []) revalidatePath(path);
  return { status: "saved", message: options.savedMessage };
}

async function updateCatalogEntry(
  formData: FormData,
  path: string,
  update: (
    id: string,
    data: { description: string; status: CatalogStatus },
  ) => Promise<unknown>,
  options?: {
    extraPaths?: readonly string[];
    missingMessage?: string;
    rejectDuplicate?: (description: string, id: string) => Promise<boolean>;
  },
): Promise<MaintenanceCatalogActionState> {
  return audited("manage-maintenance", () => updateCatalogEntryRecord(formData, path, update, options));
}

async function updateCatalogEntryRecord(
  formData: FormData,
  path: string,
  update: (
    id: string,
    data: { description: string; status: CatalogStatus },
  ) => Promise<unknown>,
  options?: {
    extraPaths?: readonly string[];
    missingMessage?: string;
    rejectDuplicate?: (description: string, id: string) => Promise<boolean>;
  },
): Promise<MaintenanceCatalogActionState> {
  const id = text(formData, "id");
  const missingMessage = options?.missingMessage ?? "No se encontró el tipo.";
  if (id.length === 0) {
    return { status: "error", message: missingMessage };
  }

  const parsed = parseCatalogEntry({
    description: text(formData, "description"),
    status: text(formData, "status"),
  });
  if (!parsed.ok) {
    return { status: "error", message: parsed.message };
  }
  if (await options?.rejectDuplicate?.(parsed.description, id)) {
    return { status: "error", message: "Ese canal ya existe." };
  }

  try {
    await update(id, {
      description: parsed.description,
      status: parsed.status,
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return { status: "error", message: missingMessage };
    }
    throw error;
  }

  revalidatePath(path);
  for (const extraPath of options?.extraPaths ?? []) revalidatePath(extraPath);
  return { status: "saved", message: "Datos guardados." };
}

async function channelNameTaken(description: string, exceptId?: string): Promise<boolean> {
  const existing = await prisma.thirdTimeChannel.findFirst({
    where: {
      description: { equals: description, mode: "insensitive" },
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    select: { id: true },
  });
  return existing !== null;
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
