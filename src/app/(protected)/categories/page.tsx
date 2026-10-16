import { Suspense } from "react";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAccess } from "@/lib/require-access";
import { statusMarkClass, StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { formatCategoryLabel, sortCategories } from "@/lib/roster";
import { cn } from "cn";

async function CategoriesPanel() {
  await requireAccess("view-categories");

  const rows = await prisma.category.findMany({
    include: {
      _count: { select: { players: true, collaborators: true } },
    },
  });
  const categories = sortCategories(rows);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {categories.length === 1
              ? "1 categoría de la actividad."
              : `${categories.length} categorías de la actividad.`}
          </p>
        </header>
        <Link
          href="/categories/third-time"
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11 gap-2 px-4")}
        >
          <Clock3 aria-hidden="true" />
          Monto del 3er tiempo
        </Link>
      </div>
      {categories.length === 0 ? (
        <p>No hay categorías cargadas.</p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {categories.map((category) => (
              <li key={category.code}>
                <article className="relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                  <StatusStripe tone={category.active ? "active" : "inactive"} />
                  <div className="flex items-start justify-between gap-3 pl-2">
                    <h2 className="text-base font-semibold">{formatCategoryLabel(category)}</h2>
                    <ActiveBadge active={category.active} />
                  </div>
                  <dl className="flex flex-col gap-1 pl-2 text-sm">
                    <Fact label="Código" value={category.code} />
                    <Fact label="Jugadoras" value={String(category._count.players)} />
                    <Fact label="Colaboradores" value={String(category._count.collaborators)} />
                  </dl>
                </article>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
              <caption className="sr-only">Categorías de la actividad</caption>
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="border-b px-3 py-2 font-medium">Categoría</th>
                  <th className="border-b px-3 py-2 font-medium">Código</th>
                  <th className="border-b px-3 py-2 font-medium">Estado</th>
                  <th className="border-b px-3 py-2 font-medium">Jugadoras</th>
                  <th className="border-b px-3 py-2 font-medium">Colaboradores</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.code}>
                    <th scope="row" className="relative border-b px-3 py-3 text-left font-semibold">
                      <StatusStripe tone={category.active ? "active" : "inactive"} />
                      <span className="pl-2">{formatCategoryLabel(category)}</span>
                    </th>
                    <td className="border-b px-3 py-3">{category.code}</td>
                    <td className="border-b px-3 py-3">
                      <ActiveBadge active={category.active} />
                    </td>
                    <td className="border-b px-3 py-3">{category._count.players}</td>
                    <td className="border-b px-3 py-3">{category._count.collaborators}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,7rem)_1fr] items-baseline gap-x-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return <StatusBadge tone={active ? "active" : "inactive"}>{active ? "Activa" : "Inactiva"}</StatusBadge>;
}

function StatusStripe({ tone }: { tone: "active" | "inactive" }) {
  return <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1.5", statusMarkClass(tone))} />;
}

function CategoriesFallback() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-40 rounded-lg bg-muted motion-safe:animate-pulse" />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {["s1", "s2", "s3", "s4"].map((id) => (
          <li key={id} className="h-32 rounded-2xl bg-muted motion-safe:animate-pulse" />
        ))}
      </ul>
      <div className="hidden h-64 rounded-xl bg-muted motion-safe:animate-pulse lg:block" />
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesFallback />}>
      <CategoriesPanel />
    </Suspense>
  );
}
