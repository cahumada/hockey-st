import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import { clubDate, formatCategoryLabel, sortCategories } from "@/lib/roster";
import {
  CategoryThirdTimeRates,
  type CategoryRateHistoryEntry,
  type CategoryRateRow,
} from "@/components/category-third-time-rates";
import { updateCategoryThirdTimeAmount } from "./actions";

async function CategoryRatesPanel() {
  await requireAccess("view-categories");
  const rows = await prisma.category.findMany({
    include: {
      thirdTimeAmountHistory: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { name: true, email: true } } },
      },
    },
  });
  const categories: CategoryRateRow[] = sortCategories(rows).map((category) => ({
    code: category.code,
    label: formatCategoryLabel(category),
    active: category.active,
    amount: decimalToString(category.thirdTimeAmount),
    updatedOn: category.thirdTimeAmountUpdatedOn ? isoDate(category.thirdTimeAmountUpdatedOn) : null,
    history: category.thirdTimeAmountHistory.map(historyEntry),
  }));

  return (
    <CategoryThirdTimeRates
      categories={categories}
      today={clubDate(new Date())}
      updateAction={updateCategoryThirdTimeAmount}
    />
  );
}

function historyEntry(entry: {
  id: string;
  previousAmount: { toString(): string } | null;
  amount: { toString(): string };
  updatedOn: Date;
  note: string | null;
  createdBy: { name: string | null; email: string | null } | null;
}): CategoryRateHistoryEntry {
  return {
    id: entry.id,
    previousAmount: decimalToString(entry.previousAmount),
    amount: entry.amount.toString(),
    updatedOn: isoDate(entry.updatedOn),
    note: entry.note,
    actor: actorLabel(entry.createdBy),
  };
}

function actorLabel(user: { name: string | null; email: string | null } | null): string {
  const name = user?.name?.trim();
  if (name) return name;
  const email = user?.email?.trim();
  if (email) return email;
  return "Sin usuario";
}

function decimalToString(amount: { toString(): string } | null): string | null {
  return amount ? amount.toString() : null;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function CategoryRatesFallback() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-32 rounded-lg bg-muted motion-safe:animate-pulse" />
      <div className="h-8 w-64 rounded-lg bg-muted motion-safe:animate-pulse" />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {["s1", "s2", "s3", "s4"].map((id) => (
          <li key={id} className="h-40 rounded-2xl bg-muted motion-safe:animate-pulse" />
        ))}
      </ul>
      <div className="hidden h-64 rounded-xl bg-muted motion-safe:animate-pulse lg:block" />
    </div>
  );
}

export default function CategoryThirdTimeRatesPage() {
  return (
    <Suspense fallback={<CategoryRatesFallback />}>
      <CategoryRatesPanel />
    </Suspense>
  );
}
