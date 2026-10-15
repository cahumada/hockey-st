import { Suspense } from "react";
import { MaintenanceCatalogBoard } from "@/components/maintenance-catalog-board";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import { createIncomeType, updateIncomeType } from "../actions";

async function IncomeTypesPanel() {
  await requireAccess("manage-maintenance");
  const rows = await prisma.incomeType.findMany({ orderBy: { legacyId: "asc" } });

  return (
    <MaintenanceCatalogBoard
      title="Tipos de ingreso"
      emptyLabel="No hay tipos cargados."
      createTitle="Nuevo tipo de ingreso"
      createLabel="Crear tipo"
      rows={rows}
      createAction={createIncomeType}
      updateAction={updateIncomeType}
    />
  );
}

function IncomeTypesFallback() {
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

export default function IncomeTypesPage() {
  return (
    <Suspense fallback={<IncomeTypesFallback />}>
      <IncomeTypesPanel />
    </Suspense>
  );
}
