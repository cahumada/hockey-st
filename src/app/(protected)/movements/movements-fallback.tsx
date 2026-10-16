export function MovementsFallback() {
  return (
    <div className="flex flex-col" aria-busy="true" aria-live="polite">
      <p className="sr-only">Cargando gastos…</p>
      <div className="flex items-end justify-between gap-3 pb-4">
        <div className="h-8 w-32 rounded-lg bg-muted motion-safe:animate-pulse" />
        <div className="h-11 w-36 rounded-lg bg-muted motion-safe:animate-pulse" />
      </div>
      <ul className="grid grid-cols-2 gap-3 pb-4 xl:grid-cols-4">
        {["overview-1", "overview-2", "overview-3", "overview-4"].map((id) => (
          <li key={id} className="h-28 rounded-xl bg-muted motion-safe:animate-pulse" />
        ))}
      </ul>
      <div className="mb-4 h-11 rounded-lg bg-muted motion-safe:animate-pulse" />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
        {["row-1", "row-2", "row-3", "row-4"].map((id) => (
          <li key={id} className="h-44 rounded-2xl bg-muted motion-safe:animate-pulse" />
        ))}
      </ul>
      <div className="hidden h-64 rounded-xl bg-muted motion-safe:animate-pulse lg:block" />
    </div>
  );
}
