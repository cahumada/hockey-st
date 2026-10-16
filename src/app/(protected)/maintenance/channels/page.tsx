import { Suspense } from "react";
import { MaintenanceCatalogBoard } from "@/components/maintenance-catalog-board";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import { createThirdTimeChannel, deleteThirdTimeChannel, updateThirdTimeChannel } from "../actions";

async function ChannelsPanel() {
  await requireAccess("manage-maintenance");
  const rows = await prisma.thirdTimeChannel.findMany({ orderBy: { description: "asc" } });

  return (
    <MaintenanceCatalogBoard
      title="Canales"
      emptyLabel="No hay canales cargados."
      emptyFilterLabel="No hay canales con ese filtro."
      createButtonLabel="Nuevo canal"
      createTitle="Nuevo canal"
      createLabel="Crear canal"
      noun={["canal", "canales"]}
      rows={rows}
      createAction={createThirdTimeChannel}
      updateAction={updateThirdTimeChannel}
      removeAction={deleteThirdTimeChannel}
      removeTitle="Quitar canal"
      removeHint="Deja de ofrecerse al cargar una cuota. Las cuotas que ya lo tienen conservan el nombre."
    />
  );
}

function ChannelsFallback() {
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

export default function ChannelsPage() {
  return (
    <Suspense fallback={<ChannelsFallback />}>
      <ChannelsPanel />
    </Suspense>
  );
}
