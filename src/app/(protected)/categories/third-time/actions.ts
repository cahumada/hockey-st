"use server";

import { revalidatePath } from "next/cache";
import {
  planCategoryRateChange,
  type CategoryRateChangeErrors,
} from "@/lib/category-third-time-rate";
import { prisma } from "@/lib/db";
import { audited } from "@/lib/require-access";
import { clubDate } from "@/lib/roster";

export type CategoryRateActionState = {
  status: "idle" | "saved" | "error";
  message: string;
  errors?: CategoryRateChangeErrors & { form?: string };
};

const ratesPath = "/categories/third-time";

export async function updateCategoryThirdTimeAmount(formData: FormData): Promise<CategoryRateActionState> {
  return audited("view-categories", () => updateCategoryThirdTimeAmountRecord(formData));
}

async function updateCategoryThirdTimeAmountRecord(formData: FormData): Promise<CategoryRateActionState> {
  const categoryCode = String(formData.get("categoryCode") ?? "").trim();
  const input = {
    amount: String(formData.get("amount") ?? ""),
    updatedOn: String(formData.get("updatedOn") ?? ""),
    note: String(formData.get("note") ?? ""),
  };
  const category = await prisma.category.findUnique({
    where: { code: categoryCode },
    select: { code: true, thirdTimeAmount: true, thirdTimeAmountUpdatedOn: true },
  });
  if (!category) {
    return {
      status: "error",
      message: "Esa categoría no existe.",
      errors: { form: "Esa categoría no existe." },
    };
  }

  const planned = planCategoryRateChange(
    { amount: decimalToString(category.thirdTimeAmount) },
    input,
    clubDate(new Date()),
  );
  if (!planned.ok) {
    return { status: "error", message: planned.message, errors: planned.errors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const written = await tx.category.updateMany({
        where: {
          code: category.code,
          thirdTimeAmount: category.thirdTimeAmount,
          thirdTimeAmountUpdatedOn: category.thirdTimeAmountUpdatedOn,
        },
        data: {
          thirdTimeAmount: planned.value.amount,
          thirdTimeAmountUpdatedOn: utcDate(planned.value.updatedOn),
        },
      });
      if (written.count !== 1) {
        throw new RateChanged();
      }
      await tx.categoryThirdTimeAmountHistory.create({
        data: {
          categoryCode: category.code,
          previousAmount: planned.value.previousAmount,
          amount: planned.value.amount,
          updatedOn: utcDate(planned.value.updatedOn),
          note: planned.value.note,
        },
      });
    });
  } catch (error) {
    if (error instanceof RateChanged) {
      return {
        status: "error",
        message: "El monto cambió. Volvé a cargar la página.",
        errors: { form: "El monto cambió. Volvé a cargar la página." },
      };
    }
    throw error;
  }

  revalidatePath(ratesPath);
  revalidatePath("/third-time");
  return { status: "saved", message: "Monto actualizado." };
}

class RateChanged extends Error {}

function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function decimalToString(amount: { toString(): string } | null): string | null {
  return amount ? amount.toString() : null;
}
