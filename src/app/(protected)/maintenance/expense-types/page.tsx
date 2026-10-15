import { Suspense } from "react";
import { MaintenanceCatalogBoard } from "@/components/maintenance-catalog-board";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import { createExpenseType, updateExpenseType } from "../actions";

async function ExpenseTypesPanel() {
  await requireAccess("manage-maintenance");
  const rows = await prisma.expenseType.findMany({ orderBy: { legacyId: "asc" } });

  return (
    <MaintenanceCatalogBoard
      title="Tipos de gasto"
      emptyLabel="No hay tipos cargados."
      createTitle="Nuevo tipo de gasto"
      createLabel="Crear tipo"
      rows={rows}
      createAction={createExpenseType}
      updateAction={updateExpenseType}
    />
  );
}

function ExpenseTypesFallback() {
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

export default function ExpenseTypesPage() {
  return (
    <Suspense fallback={<ExpenseTypesFallback />}>
      <ExpenseTypesPanel />
    </Suspense>
  );
}
