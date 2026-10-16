import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ExpenseBoard, type ExpenseChoice, type ExpenseRow } from "@/components/expense-board";
import { prisma } from "@/lib/db";
import {
  defaultExpensePeriod,
  expenseListSearchParams,
  expenseOverview,
  expensePageCount,
  expensePageSize,
  expenseSpentOnBounds,
  parseExpenseListQuery,
  sumExpenseAmounts,
  verifiedFromReceipt,
  type ExpenseListParams,
  type ExpenseListQuery,
} from "@/lib/expenses";
import { requireAccess } from "@/lib/require-access";
import { createExpense, updateExpense } from "./actions";
import { MovementsFallback } from "./movements-fallback";

async function MovementsPanel({ query }: { query: ExpenseListQuery }) {
  await requireAccess("register-movements");
  const [expenseTypes, collaborators, ledger] = await Promise.all([
    prisma.expenseType.findMany({
      orderBy: { description: "asc" },
      select: { id: true, description: true, status: true },
    }),
    prisma.collaborator.findMany({
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, categoryCode: true, status: true },
    }),
    prisma.expense.findMany({
      select: { spentOn: true, unitAmount: true, quantity: true },
    }),
  ]);
  const knownYears = spentOnYears(ledger.map((row) => row.spentOn));
  const overview = expenseOverview(
    ledger.map((row) => ({
      spentOn: row.spentOn.toISOString().slice(0, 10),
      unitAmount: row.unitAmount.toString(),
      quantity: row.quantity.toString(),
    })),
  );
  const where = expenseWhere(query, knownYears);
  const [matchCount, amountRows, expenses] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      select: { unitAmount: true, quantity: true },
    }),
    prisma.expense.findMany({
      where,
      orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * expensePageSize,
      take: expensePageSize,
      include: {
        expenseType: { select: { description: true } },
        collaborator: { select: { displayName: true, categoryCode: true } },
      },
    }),
  ]);
  const pageCount = expensePageCount(matchCount);
  if (query.page > pageCount) {
    redirect(`/movements?${expenseListSearchParams({ ...query, page: pageCount })}`);
  }

  const rows: ExpenseRow[] = expenses.map((expense) => ({
    id: expense.id,
    spentOn: expense.spentOn.toISOString().slice(0, 10),
    expenseTypeId: expense.expenseTypeId,
    expenseTypeDescription: expense.expenseType.description,
    unitAmount: expense.unitAmount.toString(),
    quantity: expense.quantity.toString(),
    collaboratorId: expense.collaboratorId,
    collaboratorName: collaboratorLabel(
      expense.collaborator.displayName,
      expense.collaborator.categoryCode,
    ),
    notes: expense.notes,
    verified: verifiedFromReceipt(Boolean(expense.receiptPath)),
    hasReceipt: Boolean(expense.receiptPath),
    receiptContentType: expense.receiptContentType,
  }));

  return (
    <ExpenseBoard
      query={query}
      defaultPeriod={defaultExpensePeriod()}
      rows={rows}
      matchCount={matchCount}
      pageCount={pageCount}
      totalAmount={sumExpenseAmounts(
        amountRows.map((row) => ({
          unitAmount: row.unitAmount.toString(),
          quantity: row.quantity.toString(),
        })),
      )}
      hasAny={ledger.length > 0}
      overview={overview}
      years={yearChoices(knownYears, query.year)}
      expenseTypes={expenseTypes.map(typeChoice)}
      collaborators={collaborators.map(collaboratorChoice)}
      receiptStorageReady={Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim())}
      createAction={createExpense}
      updateAction={updateExpense}
    />
  );
}

function expenseWhere(query: ExpenseListQuery, knownYears: readonly number[]) {
  const filters = [];
  const bounds = expenseSpentOnBounds(query, knownYears);
  if (bounds) {
    filters.push({
      OR: bounds.map((bound) => ({
        spentOn: { gte: utcDate(bound.gte), lt: utcDate(bound.lt) },
      })),
    });
  }
  if (query.status === "verified") filters.push({ receiptPath: { not: null } });
  if (query.status === "pending") filters.push({ receiptPath: null });
  if (query.expenseTypeId) filters.push({ expenseTypeId: query.expenseTypeId });
  if (query.collaboratorId) filters.push({ collaboratorId: query.collaboratorId });
  if (query.text) {
    filters.push({
      OR: [
        { notes: { contains: query.text, mode: "insensitive" as const } },
        { expenseType: { description: { contains: query.text, mode: "insensitive" as const } } },
        { collaborator: { displayName: { contains: query.text, mode: "insensitive" as const } } },
        { collaborator: { categoryCode: { contains: query.text, mode: "insensitive" as const } } },
      ],
    });
  }
  return filters.length > 0 ? { AND: filters } : {};
}

function spentOnYears(dates: readonly Date[]): number[] {
  return [...new Set(dates.map((date) => date.getUTCFullYear()))];
}

function yearChoices(knownYears: readonly number[], selected: number | null): number[] {
  const years = new Set(knownYears);
  years.add(defaultExpensePeriod().year);
  if (selected) years.add(selected);
  return [...years].sort((left, right) => right - left);
}

function utcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function typeChoice(expenseType: {
  id: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
}): ExpenseChoice {
  return {
    id: expenseType.id,
    label: expenseType.description,
    active: expenseType.status === "ACTIVE",
  };
}

function collaboratorChoice(collaborator: {
  id: string;
  displayName: string;
  categoryCode: string | null;
  status: "ACTIVE" | "INACTIVE";
}): ExpenseChoice {
  return {
    id: collaborator.id,
    label: collaboratorLabel(collaborator.displayName, collaborator.categoryCode),
    active: collaborator.status === "ACTIVE",
  };
}

function collaboratorLabel(displayName: string, categoryCode: string | null): string {
  return categoryCode ? `${categoryCode} · ${displayName}` : displayName;
}

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<ExpenseListParams>;
}) {
  const parsed = parseExpenseListQuery(await searchParams);
  if (!parsed.explicitPeriod) {
    redirect(`/movements?${expenseListSearchParams(parsed.query)}`);
  }

  return (
    <Suspense fallback={<MovementsFallback />}>
      <MovementsPanel query={parsed.query} />
    </Suspense>
  );
}
