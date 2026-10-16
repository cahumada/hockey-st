"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import {
  CalendarDays,
  CalendarRange,
  ChartColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSymlink,
  FilterX,
  ListFilter,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  SearchX,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ThirdTimeActionState } from "@/app/(protected)/third-time/actions";
import { ThirdTimeFallback } from "@/app/(protected)/third-time/third-time-fallback";
import { StatusBadge, statusMarkClass, type StatusTone } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { FileUpload } from "@/components/ui/file-upload";
import { FormNumeric } from "@/components/ui/form-numeric";
import { Modal, useModalLayer } from "@/components/ui/modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatExpenseDate,
  formatExpenseMoney,
  receiptEmbedKind,
  receiptStorageUnavailableMessage,
  validateReceiptFile,
} from "@/lib/expenses";
import {
  defaultCategoryCollaboratorId,
  formatThirdTimeMonth,
  planCategoryFeeBatch,
  type CategoryFeeBatchValues,
  thirdTimeListSearchParams,
  thirdTimeStatusLabels,
  thirdTimeSummary,
  validateThirdTimeFormValues,
  type ThirdTimeFeeStatus,
  type ThirdTimeFormErrors,
  type ThirdTimeFormValues,
  type ThirdTimeListQuery,
  type ThirdTimeOverviewCard,
  type ThirdTimeStatusChoice,
} from "@/lib/third-time";
import { cn } from "cn";

export type ThirdTimePersonChoice = {
  id: string;
  label: string;
  active: boolean;
};

export type ThirdTimePlayerChoice = ThirdTimePersonChoice & {
  categoryCode: string;
  portraitSrc: string;
};

export type ThirdTimeCollaboratorChoice = ThirdTimePersonChoice & {
  categoryCode: string | null;
  kind: string;
};

export type ThirdTimeCategoryChoice = {
  code: string;
  label: string;
  active: boolean;
  thirdTimeAmount: string | null;
};

export type ThirdTimeRow = {
  id: string;
  playerId: string;
  playerName: string;
  portraitSrc: string;
  categoryCode: string;
  categoryLabel: string;
  chargedOn: string;
  paidOn: string | null;
  amount: string | null;
  channel: string | null;
  status: ThirdTimeFeeStatus;
  controllerId: string;
  controllerName: string;
  receiptReference: string | null;
  notes: string | null;
  hasReceipt: boolean;
  receiptContentType: string | null;
};

type ThirdTimeAction = (formData: FormData) => Promise<ThirdTimeActionState>;
type Editor = { mode: "create" } | { mode: "category" } | { mode: "edit"; rowId: string } | null;

const fieldClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";
const selectTriggerClass = "h-11 w-full data-[size=default]:h-11";

const monthOptions = [
  [1, "Enero"],
  [2, "Febrero"],
  [3, "Marzo"],
  [4, "Abril"],
  [5, "Mayo"],
  [6, "Junio"],
  [7, "Julio"],
  [8, "Agosto"],
  [9, "Septiembre"],
  [10, "Octubre"],
  [11, "Noviembre"],
  [12, "Diciembre"],
] as const;

const statusFilterOptions: readonly [ThirdTimeStatusChoice, string][] = [
  ["paid", "Pagado"],
  ["pending", "Pendiente"],
  ["exempt", "Exento"],
];

const feeStatusOptions: readonly ThirdTimePersonChoice[] = (
  Object.entries(thirdTimeStatusLabels) as [ThirdTimeFeeStatus, string][]
).map(([id, label]) => ({ id, label, active: true }));

export function ThirdTimeBoard({
  query,
  defaultPeriod,
  rows,
  matchCount,
  pageCount,
  totalAmount,
  hasAny,
  overview,
  years,
  categories,
  channels,
  channelOptions,
  players,
  collaborators,
  receiptStorageReady,
  createAction,
  createCategoryAction,
  updateAction,
  deleteAction,
}: {
  query: ThirdTimeListQuery;
  defaultPeriod: { year: number; month: number };
  rows: readonly ThirdTimeRow[];
  matchCount: number;
  pageCount: number;
  totalAmount: string;
  hasAny: boolean;
  overview: readonly ThirdTimeOverviewCard[];
  years: readonly number[];
  categories: readonly ThirdTimeCategoryChoice[];
  channels: readonly string[];
  channelOptions: readonly ThirdTimePersonChoice[];
  players: readonly ThirdTimePlayerChoice[];
  collaborators: readonly ThirdTimeCollaboratorChoice[];
  receiptStorageReady: boolean;
  createAction: ThirdTimeAction;
  createCategoryAction: ThirdTimeAction;
  updateAction: ThirdTimeAction;
  deleteAction: ThirdTimeAction;
}) {
  const router = useRouter();
  const [text, setText] = useState(query.text);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterLayer, setFilterLayer] = useState<HTMLElement | null>(null);
  const [draft, setDraft] = useState(query);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [editor, setEditor] = useState<Editor>(null);
  const [receiptRowId, setReceiptRowId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleteRefreshId, setDeleteRefreshId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const deleteLock = useRef(false);
  const editing = editor?.mode === "edit" ? rows.find((row) => row.id === editor.rowId) ?? null : null;
  const removing = removingId ? rows.find((row) => row.id === removingId) ?? null : null;
  const receiptRow = receiptRowId ? rows.find((row) => row.id === receiptRowId) ?? null : null;
  const filtersActive =
    draft.statuses.length > 0 ||
    draft.categoryCodes.length > 0 ||
    draft.channels.length > 0 ||
    draft.controllerIds.length > 0 ||
    !sameNumbers(draft.years, [defaultPeriod.year]) ||
    !sameNumbers(draft.months, [defaultPeriod.month]);
  const summary = thirdTimeSummary({ count: matchCount, amount: totalAmount });

  useEffect(() => {
    if (filtersOpen) return;
    setText(query.text);
    draftRef.current = query;
    setDraft(query);
  }, [filtersOpen, query]);

  useEffect(() => {
    if (!deleteRefreshId) return;
    if (rows.some((row) => row.id === deleteRefreshId)) return;
    setDeleteRefreshId(null);
    setRemovingId(null);
    setDeleteError("");
  }, [rows, deleteRefreshId]);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === draftRef.current.text) return;
    const timer = window.setTimeout(() => {
      const current = draftRef.current;
      if (trimmed === current.text) return;
      const next = { ...current, text: trimmed, page: 1 };
      setDraft(next);
      router.push(thirdTimeHref(next), { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [router, text]);

  function visit(next: ThirdTimeListQuery) {
    draftRef.current = next;
    setDraft(next);
    router.push(thirdTimeHref(next), { scroll: false });
  }

  function commitFilters() {
    const next = draftRef.current;
    if (thirdTimeListSearchParams(next) === thirdTimeListSearchParams(query)) return;
    router.push(thirdTimeHref(next), { scroll: false });
  }

  function clearDrawerFilters() {
    visit({
      ...draftRef.current,
      statuses: [],
      years: [defaultPeriod.year],
      months: [defaultPeriod.month],
      categoryCodes: [],
      channels: [],
      controllerIds: [],
      page: 1,
    });
  }

  async function confirmDelete() {
    if (!removing || deleteLock.current) return;
    const id = removing.id;
    deleteLock.current = true;
    setDeleteError("");
    setDeleteRefreshId(id);
    try {
      const body = new FormData();
      body.set("id", id);
      const state = await deleteAction(body);
      if (state.status !== "saved") {
        setDeleteRefreshId(null);
        setDeleteError(state.message);
        return;
      }
      router.refresh();
    } finally {
      deleteLock.current = false;
    }
  }

  function clearAllFilters() {
    setText("");
    visit({
      text: "",
      statuses: [],
      years: [defaultPeriod.year],
      months: [defaultPeriod.month],
      categoryCodes: [],
      channels: [],
      controllerIds: [],
      page: 1,
    });
  }

  if (deleteRefreshId) {
    return <ThirdTimeFallback />;
  }

  return (
    <div className="flex flex-col">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">3er Tiempo</h1>
          <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
            {summary}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 px-4"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(true)}
          >
            <ListFilter aria-hidden="true" />
            Filtros
            {filtersActive ? <span aria-hidden="true" className="size-2 rounded-full bg-primary" /> : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-2 px-4"
            onClick={() => setEditor({ mode: "category" })}
          >
            <Users aria-hidden="true" />
            Por categoría
          </Button>
          <Button type="button" className="min-h-11 gap-2 px-4" onClick={() => setEditor({ mode: "create" })}>
            <Plus aria-hidden="true" />
            Nueva cuota
          </Button>
        </div>
      </header>
      <ThirdTimeOverview overview={overview} query={query} />
      <Drawer
        open={filtersOpen}
        onOpenChange={(open) => {
          setFiltersOpen(open);
          if (!open) commitFilters();
        }}
        swipeDirection="right"
      >
        <DrawerContent ref={setFilterLayer}>
          <DrawerHeader className="flex-row items-center gap-3 border-b border-border/70 px-4 py-4 text-left">
            <div className="min-w-0 flex-1">
              <DrawerTitle>Filtros</DrawerTitle>
              <DrawerDescription>{summary}</DrawerDescription>
            </div>
            <DrawerClose
              aria-label="Cerrar"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "min-h-11 min-w-11")}
            >
              <X aria-hidden="true" />
            </DrawerClose>
          </DrawerHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-4 px-4 py-4">
              <StatusFilter
                value={draft.statuses}
                onChange={(statuses) => visit({ ...draftRef.current, statuses, page: 1 })}
              />
              <SearchableSelect
                id="third-time-year"
                label="Año"
                multiple
                placeholder="Todos"
                container={filterLayer}
                options={years.map((year) => ({ value: String(year), label: String(year) }))}
                value={draft.years.map(String)}
                onValueChange={(selected) =>
                  visit({ ...draftRef.current, years: parseYearValues(selected), page: 1 })
                }
              />
              <SearchableSelect
                id="third-time-month"
                label="Mes"
                multiple
                placeholder="Todos"
                container={filterLayer}
                options={monthOptions.map(([month, label]) => ({ value: String(month), label }))}
                value={draft.months.map(String)}
                onValueChange={(selected) =>
                  visit({ ...draftRef.current, months: parseMonthValues(selected), page: 1 })
                }
              />
              <SearchableSelect
                id="third-time-category"
                label="Categoría"
                multiple
                placeholder="Todos"
                container={filterLayer}
                options={categories.map((category) => ({ value: category.code, label: category.label }))}
                value={draft.categoryCodes}
                onValueChange={(categoryCodes) =>
                  visit({ ...draftRef.current, categoryCodes: [...categoryCodes], page: 1 })
                }
              />
              <SearchableSelect
                id="third-time-channel"
                label="Canal"
                multiple
                placeholder="Todos"
                container={filterLayer}
                options={channels.map((channel) => ({ value: channel, label: channel }))}
                value={draft.channels}
                onValueChange={(selected) =>
                  visit({ ...draftRef.current, channels: [...selected], page: 1 })
                }
              />
              <SearchableSelect
                id="third-time-controller"
                label="Colaborador"
                multiple
                placeholder="Todos"
                container={filterLayer}
                options={collaborators.map((choice) => ({ value: choice.id, label: choice.label }))}
                value={draft.controllerIds}
                onValueChange={(controllerIds) =>
                  visit({ ...draftRef.current, controllerIds: [...controllerIds], page: 1 })
                }
              />
            </div>
          </ScrollArea>
          <DrawerFooter className="flex-row justify-end border-t border-border/70 bg-popover p-4">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-2 px-4"
              disabled={!filtersActive}
              onClick={clearDrawerFilters}
            >
              <FilterX aria-hidden="true" />
              Limpiar
            </Button>
            <DrawerClose className={cn(buttonVariants(), "min-h-11 gap-2 px-4")}>
              <Check aria-hidden="true" />
              Listo
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <label className="flex flex-col gap-1 pb-4 text-sm font-medium" htmlFor="third-time-search">
        Buscar
        <input
          id="third-time-search"
          type="search"
          value={text}
          placeholder="Jugadora, canal o nota"
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
          className={fieldClass}
        />
      </label>
      <div>
        {!hasAny ? (
          <p>Todavía no hay cuotas cargadas.</p>
        ) : matchCount === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <SearchX aria-hidden="true" className="size-8 text-muted-foreground" />
            <div className="max-w-sm">
              <p className="text-base font-medium">No encontramos cuotas</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No hay información con esta búsqueda. Cambiá los filtros o probá con otro texto.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" className="min-h-11 gap-2 px-4" onClick={() => setFiltersOpen(true)}>
                <ListFilter aria-hidden="true" />
                Cambiar filtros
              </Button>
              <Button type="button" variant="outline" className="min-h-11 px-4" onClick={clearAllFilters}>
                Limpiar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
              {rows.map((row) => (
                <li key={row.id} className="min-w-0">
                  <FeeCard
                    row={row}
                    onEdit={() => setEditor({ mode: "edit", rowId: row.id })}
                    onViewReceipt={() => setReceiptRowId(row.id)}
                    onDelete={() => setRemovingId(row.id)}
                  />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[72rem] border-separate border-spacing-0 text-sm">
                <caption className="sr-only">Cuotas de 3er Tiempo</caption>
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="border-b px-3 py-2 font-medium">Jugadora</th>
                    <th className="border-b px-3 py-2 font-medium">Categoría</th>
                    <th className="border-b px-3 py-2 text-right font-medium">Importe</th>
                    <th className="border-b px-3 py-2 font-medium">Mes</th>
                    <th className="border-b px-3 py-2 font-medium">Pago</th>
                    <th className="border-b px-3 py-2 font-medium">Estado</th>
                    <th className="border-b px-3 py-2 font-medium">Canal</th>
                    <th className="border-b px-3 py-2 font-medium">Colaborador</th>
                    <th className="border-b px-3 py-2 font-medium">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row" className="relative border-b px-3 py-3 text-left font-semibold text-foreground">
                        <span
                          aria-hidden="true"
                          className={cn("absolute inset-y-0 left-0 w-1.5", statusMarkClass(feeTone(row.status)))}
                        />
                        <span className="flex items-center gap-2 pl-2">
                          <PlayerAvatar src={row.portraitSrc} />
                          <span className="min-w-0">
                            <span className="block">{row.playerName}</span>
                            {row.notes ? (
                              <span className="mt-1 block text-xs font-normal text-muted-foreground">{row.notes}</span>
                            ) : null}
                          </span>
                        </span>
                      </th>
                      <td className="border-b px-3 py-3">{row.categoryLabel}</td>
                      <td className="border-b px-3 py-3 text-right">
                        <AmountValue amount={row.amount} />
                      </td>
                      <td className="border-b px-3 py-3">{formatThirdTimeMonth(row.chargedOn)}</td>
                      <td className="border-b px-3 py-3">
                        {row.paidOn ? formatExpenseDate(row.paidOn) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="border-b px-3 py-3">
                        <StatusBadge tone={feeTone(row.status)}>{thirdTimeStatusLabels[row.status]}</StatusBadge>
                      </td>
                      <td className="border-b px-3 py-3">
                        {row.channel ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="border-b px-3 py-3">{row.controllerName}</td>
                      <td className="border-b px-3 py-3">
                        <RowActions
                          label={row.playerName}
                          hasReceipt={row.hasReceipt}
                          onViewReceipt={() => setReceiptRowId(row.id)}
                          onEdit={() => setEditor({ mode: "edit", rowId: row.id })}
                          onDelete={() => setRemovingId(row.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FeePager query={query} pageCount={pageCount} />
          </>
        )}
      </div>
      {editor?.mode === "category" ? (
        <CategoryFeeModal
          players={players}
          categories={categories}
          collaborators={collaborators}
          years={years}
          defaultPeriod={defaultPeriod}
          formAction={createCategoryAction}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {editor?.mode === "create" ? (
        <FeeModal
          title="Nueva cuota"
          saveLabel="Registrar cuota"
          row={null}
          players={players}
          categories={categories}
          collaborators={collaborators}
          channelOptions={channelOptions}
          years={years}
          defaultPeriod={defaultPeriod}
          receiptStorageReady={receiptStorageReady}
          formAction={createAction}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {editing ? (
        <FeeModal
          key={editing.id}
          title={editing.playerName}
          portrait={{ src: editing.portraitSrc, alt: "" }}
          description={formatThirdTimeMonth(editing.chargedOn)}
          saveLabel="Guardar cambios"
          row={editing}
          players={players}
          categories={categories}
          collaborators={collaborators}
          channelOptions={channelOptions}
          years={years}
          defaultPeriod={defaultPeriod}
          receiptStorageReady={receiptStorageReady}
          formAction={updateAction}
          onClose={() => setEditor(null)}
          onViewReceipt={() => setReceiptRowId(editing.id)}
        />
      ) : null}
      {receiptRow?.hasReceipt ? <ReceiptPreview row={receiptRow} onClose={() => setReceiptRowId(null)} /> : null}
      {removing ? (
        <DeleteFeeDialog
          row={removing}
          message={deleteError}
          onConfirm={confirmDelete}
          onClose={() => {
            setRemovingId(null);
            setDeleteError("");
          }}
        />
      ) : null}
    </div>
  );
}

function FeeCard({
  row,
  onEdit,
  onViewReceipt,
  onDelete,
}: {
  row: ThirdTimeRow;
  onEdit: () => void;
  onViewReceipt: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1.5", statusMarkClass(feeTone(row.status)))} />
      <div className="pt-4 pr-4 pl-5">
        <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold leading-snug">
          <PlayerAvatar src={row.portraitSrc} />
          <span className="min-w-0">{row.playerName}</span>
          <StatusBadge tone={feeTone(row.status)}>{thirdTimeStatusLabels[row.status]}</StatusBadge>
        </h2>
        <p className="text-sm text-muted-foreground">
          {formatThirdTimeMonth(row.chargedOn)}
          {row.paidOn ? ` · Pago ${formatExpenseDate(row.paidOn)}` : ""}
        </p>
      </div>
      <dl className="mt-3 space-y-1 pr-4 pl-5 text-sm">
        <Fact label="Categoría" value={row.categoryLabel} />
        <Fact label="Importe" value={amountLabel(row.amount)} muted={row.amount === null} />
        <Fact label="Canal" value={row.channel ?? "—"} muted={!row.channel} />
        <Fact label="Colaborador" value={row.controllerName} />
        {row.receiptReference ? <Fact label="Referencia" value={row.receiptReference} /> : null}
        {row.notes ? <Fact label="Nota" value={row.notes} /> : null}
      </dl>
      <div className="mt-auto px-2 py-2">
        <RowActions
          label={row.playerName}
          hasReceipt={row.hasReceipt}
          onViewReceipt={onViewReceipt}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}

function FeeModal({
  title,
  description,
  portrait,
  saveLabel,
  row,
  players,
  categories,
  collaborators,
  channelOptions,
  years,
  defaultPeriod,
  receiptStorageReady,
  formAction,
  onClose,
  onViewReceipt,
}: {
  title: string;
  description?: string;
  portrait?: { src: string; alt: string };
  saveLabel: string;
  row: ThirdTimeRow | null;
  players: readonly ThirdTimePlayerChoice[];
  categories: readonly ThirdTimeCategoryChoice[];
  collaborators: readonly ThirdTimeCollaboratorChoice[];
  channelOptions: readonly ThirdTimePersonChoice[];
  years: readonly number[];
  defaultPeriod: { year: number; month: number };
  receiptStorageReady: boolean;
  formAction: ThirdTimeAction;
  onViewReceipt?: () => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | undefined>();
  const [formMessage, setFormMessage] = useState("");
  const playerChoices = choicesFor(players, row?.playerId ?? "");
  const controllerChoices = choicesFor(collaborators, row?.controllerId ?? "");
  const channelChoices = choicesFor(withCurrentChoice(channelOptions, row?.channel ?? ""), row?.channel ?? "");
  const form = useForm<ThirdTimeFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      playerId: row?.playerId ?? "",
      chargedOn: row ? monthStart(row.chargedOn) : monthStartIso(defaultPeriod.year, defaultPeriod.month),
      paidOn: row?.paidOn ?? "",
      amount: row?.amount ?? "",
      channel: row?.channel ?? "",
      status: row?.status ?? "PENDING",
      controllerId: row?.controllerId ?? "",
      receiptReference: row?.receiptReference ?? "",
      notes: row?.notes ?? "",
    },
    resolver: (values) => {
      const result = validateThirdTimeFormValues(values, {
        players: playerChoices.map((player) => ({ id: player.id, categoryCode: player.categoryCode })),
        collaboratorIds: controllerChoices.map((choice) => choice.id),
        channelNames: channelChoices.map((choice) => choice.id),
      });
      if (result.ok) return { values, errors: {} };
      return { values: {}, errors: rhfErrors(result.errors) };
    },
  });

  function chooseReceipt(next: File | null) {
    if (!next) {
      setReceiptFile(null);
      setReceiptError(undefined);
      return;
    }
    if (!receiptStorageReady) {
      setReceiptFile(null);
      setReceiptError(receiptStorageUnavailableMessage);
      return;
    }
    const checked = validateReceiptFile(next);
    if (!checked.ok) {
      setReceiptFile(null);
      setReceiptError(checked.message);
      return;
    }
    setReceiptFile(next);
    setReceiptError(undefined);
  }

  async function onSubmit(values: ThirdTimeFormValues) {
    setReceiptError(undefined);
    setFormMessage("");
    if (receiptFile) {
      if (!receiptStorageReady) {
        setReceiptError(receiptStorageUnavailableMessage);
        return;
      }
      const checked = validateReceiptFile(receiptFile);
      if (!checked.ok) {
        setReceiptError(checked.message);
        return;
      }
    }

    const body = new FormData();
    if (row) body.set("id", row.id);
    body.set("playerId", values.playerId);
    body.set("chargedOn", values.chargedOn);
    body.set("paidOn", values.paidOn);
    body.set("amount", values.amount.trim());
    body.set("channel", values.channel);
    body.set("status", values.status);
    body.set("controllerId", values.controllerId);
    body.set("receiptReference", values.receiptReference);
    body.set("notes", values.notes);
    if (receiptFile) body.set("receipt", receiptFile);

    setPending(true);
    try {
      const state = await formAction(body);
      if (state.status === "saved") {
        onClose();
        return;
      }
      setFormMessage(state.message);
      for (const [field, message] of Object.entries(state.errors ?? {})) {
        if (!message) continue;
        if (field === "receipt") {
          setReceiptError(message);
          continue;
        }
        form.setError(field as keyof ThirdTimeFormValues, { message });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open
      title={title}
      description={description}
      portrait={portrait}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="min-h-11 gap-2 px-4" onClick={onClose}>
            <X aria-hidden="true" />
            Cancelar
          </Button>
          <Button type="button" className="min-h-11 gap-2 px-4" disabled={pending} onClick={form.handleSubmit(onSubmit)}>
            <Save aria-hidden="true" />
            {pending ? "Guardando…" : saveLabel}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        {formMessage ? (
          <p aria-live="polite" className="text-sm text-destructive">
            {formMessage}
          </p>
        ) : null}
        <Controller
          name="playerId"
          control={form.control}
          render={({ field }) => (
            <PlayerSelect
              players={playerChoices}
              categories={categories}
              value={field.value || null}
              error={form.formState.errors.playerId?.message}
              onBlur={field.onBlur}
              onValueChange={(next) => {
                field.onChange(next ?? "");
                const player = next ? playerChoices.find((item) => item.id === next) : undefined;
                if (!row) {
                  const category = player
                    ? categories.find((item) => item.code === player.categoryCode)
                    : undefined;
                  form.setValue("amount", category?.thirdTimeAmount ?? "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
                if (!player || form.getValues("controllerId").trim()) return;
                const controllerId = defaultCategoryCollaboratorId(collaborators, player.categoryCode);
                if (controllerId) {
                  form.setValue("controllerId", controllerId, { shouldDirty: true, shouldValidate: true });
                }
              }}
            />
          )}
        />
        <Controller
          name="chargedOn"
          control={form.control}
          render={({ field, fieldState }) => (
            <MonthField
              value={field.value}
              years={years}
              currentYear={defaultPeriod.year}
              error={fieldState.error?.message}
              onBlur={field.onBlur}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="paidOn"
          control={form.control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1">
              <Field id="third-time-paidOn" label="Fecha de pago" error={fieldState.error?.message}>
                <DatePicker
                  id="third-time-paidOn"
                  value={field.value}
                  invalid={Boolean(fieldState.error)}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              </Field>
              {field.value ? (
                <button
                  type="button"
                  className="self-start text-xs font-normal text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => field.onChange("")}
                >
                  Quitar fecha de pago
                </button>
              ) : null}
            </div>
          )}
        />
        <FormNumeric
          form={form}
          name="amount"
          id="third-time-amount"
          label="Importe"
          minimumFractionDigits={2}
          maximumFractionDigits={2}
        />
        <div className="flex flex-col gap-1">
          <ChoiceField
            id="third-time-channel"
            label="Canal"
            placeholder="Elegí un canal"
            control={form.control}
            name="channel"
            choices={channelChoices}
            error={form.formState.errors.channel?.message}
          />
          {form.watch("channel") ? (
            <button
              type="button"
              className="self-start text-xs font-normal text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => form.setValue("channel", "", { shouldDirty: true, shouldValidate: true })}
            >
              Quitar canal
            </button>
          ) : null}
        </div>
        <StatusField control={form.control} error={form.formState.errors.status?.message} />
        <ChoiceField
          id="third-time-controller"
          label="Colaborador"
          placeholder="Elegí un colaborador"
          control={form.control}
          name="controllerId"
          choices={controllerChoices}
          error={form.formState.errors.controllerId?.message}
        />
        <Field
          id="third-time-receipt-reference"
          label="Comprobante de referencia"
          error={form.formState.errors.receiptReference?.message}
        >
          <input
            id="third-time-receipt-reference"
            type="text"
            autoComplete="off"
            className={fieldClass}
            {...form.register("receiptReference")}
          />
        </Field>
        <Field id="third-time-notes" label="Nota" error={form.formState.errors.notes?.message}>
          <textarea
            id="third-time-notes"
            rows={3}
            className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            {...form.register("notes")}
          />
        </Field>
        <FileUpload
          id="third-time-receipt"
          label="Archivo de comprobante"
          hint={receiptStorageReady ? "JPG, PNG, WebP o PDF. Hasta 5 MB." : receiptStorageUnavailableMessage}
          accept="image/jpeg,image/png,image/webp,application/pdf"
          file={receiptFile}
          onFileChange={chooseReceipt}
          error={receiptError}
          disabled={!receiptStorageReady}
          existing={
            row?.hasReceipt
              ? { label: "Comprobante guardado", onView: onViewReceipt, viewLabel: "Ver" }
              : undefined
          }
        />
      </form>
    </Modal>
  );
}

function CategoryFeeModal({
  players,
  categories,
  collaborators,
  years,
  defaultPeriod,
  formAction,
  onClose,
}: {
  players: readonly ThirdTimePlayerChoice[];
  categories: readonly ThirdTimeCategoryChoice[];
  collaborators: readonly ThirdTimeCollaboratorChoice[];
  years: readonly number[];
  defaultPeriod: { year: number; month: number };
  formAction: ThirdTimeAction;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const categoryOptions = categories.filter((category) => category.active);
  const controllerChoices = choicesFor(collaborators, "");
  const form = useForm<CategoryFeeBatchValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      categoryCode: "",
      chargedOn: monthStartIso(defaultPeriod.year, defaultPeriod.month),
      amount: "",
      status: "PENDING",
      controllerId: "",
    },
    resolver: (values) => {
      const result = planCategoryFeeBatch(values, {
        categoryCodes: categoryOptions.map((category) => category.code),
        players: players.map((player) => ({
          id: player.id,
          categoryCode: player.categoryCode,
          active: player.active,
        })),
        collaboratorIds: controllerChoices.map((choice) => choice.id),
        existingCount: 0,
      });
      if (result.ok) return { values, errors: {} };
      return { values: {}, errors: rhfErrors(result.errors) };
    },
  });
  const categoryCode = form.watch("categoryCode");
  const activePlayers = players.filter((player) => player.active && player.categoryCode === categoryCode).length;

  async function onSubmit(values: CategoryFeeBatchValues) {
    setFormMessage("");
    const body = new FormData();
    body.set("categoryCode", values.categoryCode);
    body.set("chargedOn", values.chargedOn);
    body.set("amount", values.amount.trim());
    body.set("status", values.status);
    body.set("controllerId", values.controllerId);
    setPending(true);
    try {
      const state = await formAction(body);
      if (state.status === "saved") {
        onClose();
        return;
      }
      setFormMessage(state.message);
      for (const [field, message] of Object.entries(state.errors ?? {})) {
        if (!message || field === "form") continue;
        form.setError(field as keyof CategoryFeeBatchValues, { message });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open
      title="Cuota por categoría"
      description="Una cuota para cada jugadora activa. El estado arranca en Pendiente."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="min-h-11 gap-2 px-4" onClick={onClose}>
            <X aria-hidden="true" />
            Cancelar
          </Button>
          <Button type="button" className="min-h-11 gap-2 px-4" disabled={pending} onClick={form.handleSubmit(onSubmit)}>
            <Save aria-hidden="true" />
            {pending ? "Guardando…" : "Registrar cuotas"}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-3" onSubmit={form.handleSubmit(onSubmit)}>
        {formMessage ? (
          <p aria-live="polite" className="text-sm text-destructive">
            {formMessage}
          </p>
        ) : null}
        <CategoryBatchSelect
          options={categoryOptions.map((category) => ({ value: category.code, label: category.label }))}
          value={categoryCode || null}
          error={form.formState.errors.categoryCode?.message}
          onBlur={() => form.trigger("categoryCode")}
          onValueChange={(next) => {
            const code = next ?? "";
            form.setValue("categoryCode", code, { shouldDirty: true, shouldValidate: true });
            const category = categoryOptions.find((item) => item.code === code);
            form.setValue("amount", category?.thirdTimeAmount ?? "", {
              shouldDirty: true,
              shouldValidate: true,
            });
            const controllerId = code ? defaultCategoryCollaboratorId(collaborators, code) : null;
            form.setValue("controllerId", controllerId ?? "", { shouldDirty: true, shouldValidate: true });
          }}
        />
        {categoryCode ? (
          <p className="text-sm text-muted-foreground">
            {activePlayers === 1 ? "1 jugadora activa." : `${activePlayers} jugadoras activas.`}
          </p>
        ) : null}
        <Controller
          name="chargedOn"
          control={form.control}
          render={({ field, fieldState }) => (
            <MonthField
              value={field.value}
              years={years}
              currentYear={defaultPeriod.year}
              error={fieldState.error?.message}
              onBlur={field.onBlur}
              onChange={field.onChange}
            />
          )}
        />
        <FormNumeric
          form={form}
          name="amount"
          id="third-time-category-amount"
          label="Importe"
          minimumFractionDigits={2}
          maximumFractionDigits={2}
        />
        <StatusField control={form.control} error={form.formState.errors.status?.message} />
        <ChoiceField
          id="third-time-category-controller"
          label="Colaborador"
          placeholder="Elegí un colaborador"
          control={form.control}
          name="controllerId"
          choices={controllerChoices}
          error={form.formState.errors.controllerId?.message}
        />
      </form>
    </Modal>
  );
}

function CategoryBatchSelect({
  options,
  value,
  error,
  onBlur,
  onValueChange,
}: {
  options: readonly { value: string; label: string }[];
  value: string | null;
  error?: string;
  onBlur: () => void;
  onValueChange: (value: string | null) => void;
}) {
  const layer = useModalLayer();
  return (
    <SearchableSelect
      id="third-time-category-batch"
      label="Categoría"
      placeholder="Elegí una categoría"
      container={layer}
      options={options}
      value={value}
      error={error}
      onBlur={onBlur}
      onValueChange={onValueChange}
    />
  );
}

function StatusFilter({
  value,
  onChange,
}: {
  value: readonly ThirdTimeStatusChoice[];
  onChange: (statuses: ThirdTimeStatusChoice[]) => void;
}) {
  const selected = value.length === 1 ? value[0] : value.length === 0 ? "all" : null;
  const options = [
    { value: "all" as const, label: "Todos" },
    ...statusFilterOptions.map(([optionValue, label]) => ({ value: optionValue, label })),
  ];

  return (
    <fieldset className="flex flex-col gap-1 border-0 p-0">
      <legend className="text-sm font-medium">Estado</legend>
      <div role="radiogroup" aria-label="Estado" className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const pressed = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={pressed}
              onClick={() => onChange(option.value === "all" ? [] : [option.value])}
              className={cn(
                "min-h-11 rounded-lg px-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                pressed ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function StatusField<T extends FieldValues & { status: string }>({
  control,
  error,
}: {
  control: Control<T>;
  error?: string;
}) {
  return (
    <Controller
      name={"status" as FieldPath<T>}
      control={control}
      render={({ field }) => (
        <fieldset className="flex flex-col gap-1 border-0 p-0">
          <legend className="text-sm font-medium">Estado</legend>
          <div role="radiogroup" aria-label="Estado" className="grid grid-cols-3 gap-2">
            {feeStatusOptions.map((option) => {
              const selected = field.value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => field.onChange(option.id)}
                  onBlur={field.onBlur}
                  className={cn(
                    "min-h-11 rounded-lg px-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {error ? <span className="text-xs font-normal text-destructive">{error}</span> : null}
        </fieldset>
      )}
    />
  );
}

function MonthField({
  value,
  years,
  currentYear,
  error,
  onBlur,
  onChange,
}: {
  value: string;
  years: readonly number[];
  currentYear: number;
  error?: string;
  onBlur: () => void;
  onChange: (value: string) => void;
}) {
  const match = /^(\d{4})-(\d{2})/.exec(value);
  const year = match?.[1] ?? "";
  const month = match ? String(Number(match[2])) : "";
  const yearChoices = monthYearChoices(years, year, currentYear);
  const monthItems = monthOptions.map(([itemMonth, label]) => ({ value: String(itemMonth), label }));
  const yearItems = yearChoices.map((itemYear) => ({ value: String(itemYear), label: String(itemYear) }));

  function update(nextYear: string, nextMonth: string) {
    if (!nextYear || !nextMonth) {
      onChange("");
      return;
    }
    onChange(monthStartIso(Number(nextYear), Number(nextMonth)));
  }

  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      <span id="third-time-month-label">Mes</span>
      <div
        role="group"
        aria-labelledby="third-time-month-label"
        className="grid grid-cols-[minmax(0,1.4fr)_minmax(6.5rem,0.8fr)] gap-2"
      >
        <Select items={monthItems} value={month || null} onValueChange={(next: string | null) => update(year, next ?? "")}>
          <SelectTrigger id="third-time-month" className={selectTriggerClass} onBlur={onBlur}>
            <SelectValue placeholder="Mes" />
          </SelectTrigger>
          <SelectContent>
            {monthItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={yearItems} value={year || null} onValueChange={(next: string | null) => update(next ?? "", month)}>
          <SelectTrigger id="third-time-year" aria-label="Año" className={selectTriggerClass} onBlur={onBlur}>
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            {yearItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error ? <span className="text-xs font-normal text-destructive">{error}</span> : null}
    </div>
  );
}

function PlayerSelect({
  players,
  categories,
  value,
  error,
  onBlur,
  onValueChange,
}: {
  players: readonly ThirdTimePlayerChoice[];
  categories: readonly ThirdTimeCategoryChoice[];
  value: string | null;
  error?: string;
  onBlur: () => void;
  onValueChange: (value: string | null) => void;
}) {
  const layer = useModalLayer();
  const portraits = new Map(players.map((player) => [player.id, player.portraitSrc]));
  const selectedSrc = value ? portraits.get(value) : undefined;

  return (
    <SearchableSelect
      id="third-time-player"
      label="Jugadora"
      placeholder="Elegí una jugadora"
      container={layer}
      options={players.map((player) => ({
        value: player.id,
        label: player.label,
        group: player.categoryCode,
      }))}
      groups={categories.map((category) => ({ value: category.code, label: category.label }))}
      value={value}
      error={error}
      leading={selectedSrc ? <PlayerAvatar src={selectedSrc} /> : undefined}
      renderOption={(option) => {
        const src = portraits.get(option.value);
        return src ? <PlayerName name={option.label} portraitSrc={src} /> : option.label;
      }}
      onBlur={onBlur}
      onValueChange={onValueChange}
    />
  );
}

function ChoiceField<T extends FieldValues>({
  id,
  label,
  placeholder,
  control,
  name,
  choices,
  error,
}: {
  id: string;
  label: string;
  placeholder: string;
  control: Control<T>;
  name: FieldPath<T>;
  choices: readonly (ThirdTimePersonChoice & { portraitSrc?: string })[];
  error?: string;
}) {
  const items = choices.map((choice) => ({ value: choice.id, label: choice.label }));
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field id={id} label={label} error={error}>
          <Select items={items} value={field.value || null} onValueChange={(next: string | null) => field.onChange(next ?? "")}>
            <SelectTrigger id={id} className={selectTriggerClass} onBlur={field.onBlur}>
              <SelectValue placeholder={placeholder}>
                {(selected: string | null) => {
                  const choice = selected ? choices.find((item) => item.id === selected) : undefined;
                  if (!choice) return placeholder;
                  return choice.portraitSrc ? (
                    <PlayerName name={choice.label} portraitSrc={choice.portraitSrc} />
                  ) : (
                    choice.label
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {choices.map((choice) => (
                <SelectItem key={choice.id} value={choice.id}>
                  {choice.portraitSrc ? (
                    <PlayerName name={choice.label} portraitSrc={choice.portraitSrc} />
                  ) : (
                    choice.label
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}

function PlayerName({ name, portraitSrc }: { name: string; portraitSrc: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <PlayerAvatar src={portraitSrc} />
      <span className="truncate">{name}</span>
    </span>
  );
}

function PlayerAvatar({ src }: { src: string }) {
  return (
    // The private avatar route needs the session cookie, which next/image does not send.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      referrerPolicy="no-referrer"
      className="size-8 shrink-0 rounded-full object-cover"
    />
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={id}>
      {label}
      {children}
      {error ? <span className="text-xs font-normal text-destructive">{error}</span> : null}
    </label>
  );
}

function ReceiptPreview({ row, onClose }: { row: ThirdTimeRow; onClose: () => void }) {
  const href = `/api/third-time/${row.id}/receipt`;
  const image = receiptEmbedKind(row.receiptContentType) === "image";
  const [ready, setReady] = useState(false);
  const label = `Comprobante de ${row.playerName}`;

  useEffect(() => {
    setReady(false);
  }, [href]);

  return (
    <Modal
      open
      wide
      headerClose
      title="Comprobante"
      description={`${row.playerName} · ${formatThirdTimeMonth(row.chargedOn)} · ${amountLabel(row.amount)} · ${row.controllerName}`}
      onClose={onClose}
    >
      <div className={cn("relative", ready ? undefined : "min-h-[min(70dvh,640px)]")}>
        {ready ? null : (
          <div
            role="status"
            aria-label="Cargando comprobante"
            className="absolute inset-0 rounded-lg bg-muted motion-safe:animate-pulse"
          />
        )}
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={href}
            alt={label}
            onLoad={() => setReady(true)}
            onError={() => setReady(true)}
            className={cn(
              "mx-auto max-h-[70dvh] w-full rounded-lg bg-muted object-contain",
              ready ? "relative" : "invisible absolute inset-0",
            )}
          />
        ) : (
          <iframe
            src={href}
            title={label}
            onLoad={() => setReady(true)}
            className={cn(
              "h-[min(70dvh,640px)] w-full rounded-lg border border-border bg-background",
              ready ? "relative" : "invisible absolute inset-0",
            )}
          />
        )}
      </div>
    </Modal>
  );
}

function DeleteFeeDialog({
  row,
  message,
  onConfirm,
  onClose,
}: {
  row: ThirdTimeRow;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      title="Eliminar cuota"
      description={`${row.playerName} · ${formatThirdTimeMonth(row.chargedOn)}`}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="min-h-11 gap-2 px-4" onClick={onClose}>
            <X aria-hidden="true" />
            Cancelar
          </Button>
          <Button type="button" variant="destructive" className="min-h-11 gap-2 px-4" onClick={onConfirm}>
            <Trash2 aria-hidden="true" />
            Eliminar
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        La cuota deja de verse en el listado. El registro se conserva.
      </p>
      {message ? (
        <p aria-live="polite" className="mt-3 text-sm text-destructive">
          {message}
        </p>
      ) : null}
    </Modal>
  );
}

function RowActions({
  label,
  hasReceipt,
  onViewReceipt,
  onEdit,
  onDelete,
}: {
  label: string;
  hasReceipt: boolean;
  onViewReceipt: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div role="group" aria-label={`Acciones de ${label}`} className="flex justify-end gap-1">
      {hasReceipt ? (
        <IconAction label="Ver comprobante" onClick={onViewReceipt}>
          <FileSymlink aria-hidden="true" />
        </IconAction>
      ) : null}
      <IconAction label="Editar" onClick={onEdit}>
        <Pencil aria-hidden="true" />
      </IconAction>
      <IconAction label="Eliminar" onClick={onDelete}>
        <Trash2 aria-hidden="true" />
      </IconAction>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <span className="group/icon relative inline-flex">
      <Button type="button" variant="ghost" size="icon" aria-label={label} className="min-h-11 min-w-11" onClick={onClick}>
        {children}
      </Button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 bottom-full z-20 mb-1.5 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[0.6875rem] font-medium text-background opacity-0 shadow-sm transition-opacity group-hover/icon:opacity-100 group-focus-within/icon:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

const overviewIcons: Record<ThirdTimeOverviewCard["id"], LucideIcon> = {
  "current-month": CalendarDays,
  "previous-month": CalendarRange,
  "six-months": ChartColumn,
  "current-year": CalendarDays,
};

const overviewTone: Record<ThirdTimeOverviewCard["id"], string> = {
  "current-month": "bg-status-active text-status-active-foreground",
  "previous-month": "bg-status-inactive text-status-inactive-foreground",
  "six-months": "bg-status-temporary text-status-temporary-foreground",
  "current-year": "bg-status-permanent text-status-permanent-foreground",
};

const overviewBar: Record<ThirdTimeOverviewCard["id"], string> = {
  "current-month": "bg-chart-2",
  "previous-month": "bg-chart-1",
  "six-months": "bg-chart-5",
  "current-year": "bg-chart-4",
};

function ThirdTimeOverview({
  overview,
  query,
}: {
  overview: readonly ThirdTimeOverviewCard[];
  query: ThirdTimeListQuery;
}) {
  return (
    <section aria-label="Panorama de cuotas" className="pb-4">
      <h2 className="sr-only">Panorama de cuotas</h2>
      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {overview.map((card) => (
          <li key={card.id}>
            <OverviewCard card={card} selected={overviewSelected(card, query)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function OverviewCard({ card, selected }: { card: ThirdTimeOverviewCard; selected: boolean }) {
  const Icon = overviewIcons[card.id];
  const body = (
    <>
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", overviewBar[card.id])} />
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        <span>{card.title}</span>
      </div>
      <p className="mt-2 text-lg font-semibold tracking-tight tabular-nums">{formatExpenseMoney(card.amount)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {card.period} · {card.count === 1 ? "1 cuota" : `${card.count} cuotas`}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div className={cn("h-full rounded-full", overviewBar[card.id])} style={{ width: `${card.share}%` }} />
      </div>
      {card.changeLabel ? (
        <p className="mt-2 text-xs leading-snug">{card.changeLabel}</p>
      ) : (
        <p className="mt-2 text-xs leading-snug text-muted-foreground">
          {card.id === "six-months" ? "Incluye este mes" : "Período completo"}
        </p>
      )}
    </>
  );
  const className = cn(
    "relative flex h-full flex-col overflow-hidden rounded-xl p-3 pl-4 text-left",
    overviewTone[card.id],
    selected ? "ring-2 ring-ring" : "ring-1 ring-foreground/10",
    card.listPeriod && "transition hover:ring-ring",
  );

  if (!card.listPeriod) {
    return <article className={className}>{body}</article>;
  }

  return (
    <Link
      href={thirdTimeHref({
        text: "",
        statuses: [],
        years: [card.listPeriod.year],
        months: card.listPeriod.month === null ? [] : [card.listPeriod.month],
        categoryCodes: [],
        channels: [],
        controllerIds: [],
        page: 1,
      })}
      aria-current={selected ? "true" : undefined}
      className={className}
    >
      {body}
    </Link>
  );
}

function overviewSelected(card: ThirdTimeOverviewCard, query: ThirdTimeListQuery): boolean {
  if (!card.listPeriod) return false;
  if (
    query.text ||
    query.statuses.length > 0 ||
    query.categoryCodes.length > 0 ||
    query.channels.length > 0 ||
    query.controllerIds.length > 0
  ) {
    return false;
  }
  const months = card.listPeriod.month === null ? [] : [card.listPeriod.month];
  return sameNumbers(query.years, [card.listPeriod.year]) && sameNumbers(query.months, months);
}

function FeePager({ query, pageCount }: { query: ThirdTimeListQuery; pageCount: number }) {
  const linkClass = "inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium";
  return (
    <nav aria-label="Páginas" className="flex items-center justify-between gap-3 pt-4">
      {query.page <= 1 ? (
        <span className={cn(linkClass, "text-muted-foreground")}>
          <ChevronLeft aria-hidden="true" className="size-4" />
          Anterior
        </span>
      ) : (
        <Link href={thirdTimeHref({ ...query, page: query.page - 1 })} className={linkClass}>
          <ChevronLeft aria-hidden="true" className="size-4" />
          Anterior
        </Link>
      )}
      <p className="text-sm text-muted-foreground">
        Página {query.page} de {pageCount}
      </p>
      {query.page >= pageCount ? (
        <span className={cn(linkClass, "text-muted-foreground")}>
          Siguiente
          <ChevronRight aria-hidden="true" className="size-4" />
        </span>
      ) : (
        <Link href={thirdTimeHref({ ...query, page: query.page + 1 })} className={linkClass}>
          Siguiente
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </nav>
  );
}

function AmountValue({ amount }: { amount: string | null }) {
  if (!amount) return <span className="text-muted-foreground">Sin importe</span>;
  return <span className="font-medium tabular-nums">{formatExpenseMoney(amount)}</span>;
}

function Fact({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,6.5rem)_1fr] items-baseline gap-x-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("min-w-0 text-right font-medium", muted && "font-normal text-muted-foreground")}>{value}</dd>
    </div>
  );
}

function withCurrentChoice(choices: readonly ThirdTimePersonChoice[], currentId: string): ThirdTimePersonChoice[] {
  if (!currentId || choices.some((choice) => choice.id === currentId)) return [...choices];
  return [...choices, { id: currentId, label: currentId, active: false }];
}

function monthStart(iso: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  return match ? `${match[1]}-${match[2]}-01` : "";
}

function monthStartIso(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function monthYearChoices(years: readonly number[], selectedYear: string, currentYear: number): number[] {
  const values = new Set(years);
  values.add(currentYear);
  values.add(currentYear + 1);
  if (/^\d{4}$/.test(selectedYear)) values.add(Number(selectedYear));
  return [...values].sort((left, right) => right - left);
}

function choicesFor<T extends ThirdTimePersonChoice>(choices: readonly T[], currentId: string): T[] {
  return choices.filter((choice) => choice.active || choice.id === currentId);
}

function feeTone(status: ThirdTimeFeeStatus): StatusTone {
  if (status === "PAID") return "active";
  if (status === "PENDING") return "temporary";
  return "inactive";
}

function amountLabel(amount: string | null): string {
  return amount ? formatExpenseMoney(amount) : "Sin importe";
}

function parseYearValues(values: readonly string[]): number[] {
  return [...new Set(values.flatMap((value) => {
    if (!/^\d{4}$/.test(value)) return [];
    const year = Number(value);
    return year >= 2000 && year <= 2100 ? [year] : [];
  }))].sort((left, right) => right - left);
}

function parseMonthValues(values: readonly string[]): number[] {
  return [...new Set(values.flatMap((value) => {
    const month = Number(value);
    return month >= 1 && month <= 12 ? [month] : [];
  }))].sort((left, right) => left - right);
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function thirdTimeHref(query: ThirdTimeListQuery): string {
  return `/third-time?${thirdTimeListSearchParams(query)}`;
}

function rhfErrors(errors: Partial<Record<string, string>>) {
  return Object.fromEntries(
    Object.entries(errors).flatMap(([key, message]) => (message ? [[key, { type: "validate", message }]] : [])),
  );
}
