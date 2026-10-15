"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import {
  CalendarDays,
  CalendarRange,
  ChartColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSymlink,
  ListFilter,
  Pencil,
  Plus,
  SearchX,
  Save,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ExpenseActionState } from "@/app/(protected)/movements/actions";
import { statusMarkClass } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { DatePicker } from "@/components/ui/date-picker";
import { FileUpload } from "@/components/ui/file-upload";
import { FormNumeric } from "@/components/ui/form-numeric";
import { Modal } from "@/components/ui/modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  expenseListSearchParams,
  expenseSummary,
  type ExpenseOverviewCard,
  formatExpenseDate,
  formatExpenseMoney,
  receiptEmbedKind,
  receiptStorageUnavailableMessage,
  validateExpenseFormValues,
  validateReceiptFile,
  type ExpenseFormErrors,
  type ExpenseFormValues,
  type ExpenseListQuery,
} from "@/lib/expenses";
import { cn } from "cn";

export type ExpenseChoice = {
  id: string;
  label: string;
  active: boolean;
};

export type ExpenseRow = {
  id: string;
  spentOn: string;
  expenseTypeId: string;
  expenseTypeDescription: string;
  unitAmount: string;
  quantity: string;
  collaboratorId: string;
  collaboratorName: string;
  notes: string | null;
  verified: boolean;
  hasReceipt: boolean;
  receiptContentType: string | null;
};

type ExpenseAction = (formData: FormData) => Promise<ExpenseActionState>;
type Editor = { mode: "create" } | { mode: "edit"; rowId: string } | null;

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

export function ExpenseBoard({
  query,
  defaultPeriod,
  rows,
  matchCount,
  pageCount,
  totalAmount,
  hasAny,
  overview,
  years,
  expenseTypes,
  collaborators,
  receiptStorageReady,
  createAction,
  updateAction,
}: {
  query: ExpenseListQuery;
  defaultPeriod: { year: number; month: number };
  rows: readonly ExpenseRow[];
  matchCount: number;
  pageCount: number;
  totalAmount: string;
  hasAny: boolean;
  overview: readonly ExpenseOverviewCard[];
  years: readonly number[];
  expenseTypes: readonly ExpenseChoice[];
  collaborators: readonly ExpenseChoice[];
  receiptStorageReady: boolean;
  createAction: ExpenseAction;
  updateAction: ExpenseAction;
}) {
  const router = useRouter();
  const [text, setText] = useState(query.text);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editor, setEditor] = useState<Editor>(null);
  const [receiptRowId, setReceiptRowId] = useState<string | null>(null);
  const editing =
    editor?.mode === "edit" ? rows.find((row) => row.id === editor.rowId) ?? null : null;
  const receiptRow = receiptRowId ? rows.find((row) => row.id === receiptRowId) ?? null : null;
  const filtersActive =
    query.status !== "all" ||
    query.expenseTypeId !== null ||
    query.collaboratorId !== null ||
    query.year !== defaultPeriod.year ||
    query.month !== defaultPeriod.month;

  useEffect(() => {
    setText(query.text);
  }, [query.text]);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === query.text) return;
    const timer = window.setTimeout(() => {
      router.push(expenseHref({ ...query, text: trimmed, page: 1 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, router, text]);

  function visit(next: ExpenseListQuery) {
    router.push(expenseHref(next));
  }

  function clearDrawerFilters() {
    visit({
      ...query,
      status: "all",
      year: defaultPeriod.year,
      month: defaultPeriod.month,
      expenseTypeId: null,
      collaboratorId: null,
      page: 1,
    });
  }

  function clearAllFilters() {
    setText("");
    visit({
      text: "",
      status: "all",
      year: defaultPeriod.year,
      month: defaultPeriod.month,
      expenseTypeId: null,
      collaboratorId: null,
      page: 1,
    });
  }

  return (
    <div className="flex flex-col">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
          <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
            {expenseSummary({ count: matchCount, amount: totalAmount })}
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
            {filtersActive ? (
              <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
            ) : null}
          </Button>
          <Button type="button" className="min-h-11 gap-2 px-4" onClick={() => setEditor({ mode: "create" })}>
            <Plus aria-hidden="true" />
            Nuevo gasto
          </Button>
        </div>
      </header>
      <ExpenseOverview overview={overview} query={query} />
      <Drawer open={filtersOpen} onOpenChange={setFiltersOpen} swipeDirection="right">
        <DrawerContent>
          <DrawerHeader className="flex-row items-center gap-3 border-b border-border/70 px-4 py-4 text-left">
            <div className="min-w-0 flex-1">
              <DrawerTitle>Filtros</DrawerTitle>
              <DrawerDescription>{expenseSummary({ count: matchCount, amount: totalAmount })}</DrawerDescription>
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
              <FilterSelect
                id="expense-status"
                label="Estado"
                value={query.status}
                onChange={(status) =>
                  visit({
                    ...query,
                    status: status === "verified" || status === "pending" ? status : "all",
                    page: 1,
                  })
                }
              >
                <option value="all">Todos</option>
                <option value="verified">Verificados</option>
                <option value="pending">Pendientes</option>
              </FilterSelect>
              <FilterSelect
                id="expense-year"
                label="Año"
                value={query.year === null ? "all" : String(query.year)}
                onChange={(year) =>
                  visit({ ...query, year: year === "all" ? null : Number(year), page: 1 })
                }
              >
                <option value="all">Todos</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                id="expense-month"
                label="Mes"
                value={query.month === null ? "all" : String(query.month)}
                onChange={(month) =>
                  visit({ ...query, month: month === "all" ? null : Number(month), page: 1 })
                }
              >
                <option value="all">Todos</option>
                {monthOptions.map(([month, label]) => (
                  <option key={month} value={month}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                id="expense-filter-type"
                label="Tipo"
                value={query.expenseTypeId ?? ""}
                onChange={(expenseTypeId) => visit({ ...query, expenseTypeId: expenseTypeId || null, page: 1 })}
              >
                <option value="">Todos</option>
                {expenseTypes.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                id="expense-filter-collaborator"
                label="Colaborador"
                value={query.collaboratorId ?? ""}
                onChange={(collaboratorId) =>
                  visit({ ...query, collaboratorId: collaboratorId || null, page: 1 })
                }
              >
                <option value="">Todos</option>
                {collaborators.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
              </FilterSelect>
            </div>
          </ScrollArea>
          <DrawerFooter className="flex-row justify-end border-t border-border/70 bg-popover p-4">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 px-4"
              disabled={!filtersActive}
              onClick={clearDrawerFilters}
            >
              Limpiar
            </Button>
            <DrawerClose className={cn(buttonVariants(), "min-h-11 px-4")}>Listo</DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <label className="flex flex-col gap-1 pb-4 text-sm font-medium" htmlFor="expense-search">
        Buscar
        <input
          id="expense-search"
          type="search"
          value={text}
          placeholder="Tipo, colaborador o nota"
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
          className={fieldClass}
        />
      </label>
      <div>
        {!hasAny ? (
          <p>Todavía no hay gastos cargados.</p>
        ) : matchCount === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <SearchX aria-hidden="true" className="size-8 text-muted-foreground" />
            <div className="max-w-sm">
              <p className="text-base font-medium">No encontramos gastos</p>
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
                  <ExpenseCard
                    row={row}
                    onEdit={() => setEditor({ mode: "edit", rowId: row.id })}
                    onViewReceipt={() => setReceiptRowId(row.id)}
                  />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <caption className="sr-only">Gastos</caption>
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="border-b px-3 py-2 font-medium">Fecha</th>
                    <th className="border-b px-3 py-2 font-medium">Tipo</th>
                    <th className="border-b px-3 py-2 text-right font-medium">Total</th>
                    <th className="border-b px-3 py-2 font-medium">Colaborador</th>
                    <th className="border-b px-3 py-2 font-medium">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                      <tr key={row.id}>
                        <th
                          scope="row"
                          className="relative border-b px-3 py-3 text-left font-semibold text-foreground"
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute inset-y-0 left-0 w-1.5",
                              statusMarkClass(row.verified ? "active" : "temporary"),
                            )}
                          />
                          <span className="block pl-2">{formatExpenseDate(row.spentOn)}</span>
                        </th>
                        <td className="border-b px-3 py-3">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{row.expenseTypeDescription}</span>
                            <VerifiedBadge verified={row.verified} />
                          </span>
                          {row.notes ? (
                            <span className="mt-1 block text-xs text-muted-foreground">{row.notes}</span>
                          ) : null}
                        </td>
                        <td className="border-b px-3 py-3 text-right font-medium tabular-nums">
                          {formatExpenseMoney(rowTotal(row))}
                        </td>
                        <td className="border-b px-3 py-3">{row.collaboratorName}</td>
                        <td className="border-b px-3 py-3">
                          <RowActions
                            label={row.expenseTypeDescription}
                            hasReceipt={row.hasReceipt}
                            onViewReceipt={() => setReceiptRowId(row.id)}
                            onEdit={() => setEditor({ mode: "edit", rowId: row.id })}
                          />
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ExpensePager query={query} pageCount={pageCount} />
          </>
        )}
      </div>
      {editor?.mode === "create" ? (
        <ExpenseModal
          title="Nuevo gasto"
          saveLabel="Registrar gasto"
          row={null}
          expenseTypes={expenseTypes}
          collaborators={collaborators}
          receiptStorageReady={receiptStorageReady}
          formAction={createAction}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {editing ? (
        <ExpenseModal
          key={editing.id}
          title={editing.expenseTypeDescription}
          description={formatExpenseDate(editing.spentOn)}
          saveLabel="Guardar cambios"
          row={editing}
          expenseTypes={expenseTypes}
          collaborators={collaborators}
          receiptStorageReady={receiptStorageReady}
          formAction={updateAction}
          onClose={() => setEditor(null)}
          onViewReceipt={() => setReceiptRowId(editing.id)}
        />
      ) : null}
      {receiptRow?.hasReceipt ? (
        <ReceiptPreview row={receiptRow} onClose={() => setReceiptRowId(null)} />
      ) : null}
    </div>
  );
}

function ExpenseCard({
  row,
  onEdit,
  onViewReceipt,
}: {
  row: ExpenseRow;
  onEdit: () => void;
  onViewReceipt: () => void;
}) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1.5",
          statusMarkClass(row.verified ? "active" : "temporary"),
        )}
      />
      <div className="pt-4 pr-4 pl-5">
        <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold leading-snug">
          <span>{row.expenseTypeDescription}</span>
          <VerifiedBadge verified={row.verified} />
        </h2>
        <p className="text-sm text-muted-foreground">{formatExpenseDate(row.spentOn)}</p>
      </div>
      <dl className="mt-3 space-y-1 pr-4 pl-5 text-sm">
        <Fact label="Total" value={formatExpenseMoney(rowTotal(row))} />
        <Fact label="Colaborador" value={row.collaboratorName} />
        {row.notes ? <Fact label="Nota" value={row.notes} /> : null}
      </dl>
      <div className="mt-auto px-2 py-2">
        <RowActions
          label={row.expenseTypeDescription}
          hasReceipt={row.hasReceipt}
          onViewReceipt={onViewReceipt}
          onEdit={onEdit}
        />
      </div>
    </article>
  );
}

function ExpenseModal({
  title,
  description,
  saveLabel,
  row,
  expenseTypes,
  collaborators,
  receiptStorageReady,
  formAction,
  onClose,
  onViewReceipt,
}: {
  title: string;
  description?: string;
  saveLabel: string;
  row: ExpenseRow | null;
  expenseTypes: readonly ExpenseChoice[];
  collaborators: readonly ExpenseChoice[];
  receiptStorageReady: boolean;
  formAction: ExpenseAction;
  onViewReceipt?: () => void;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | undefined>();
  const [formMessage, setFormMessage] = useState("");
  const typeChoices = choicesFor(expenseTypes, row?.expenseTypeId ?? "");
  const collaboratorChoices = choicesFor(collaborators, row?.collaboratorId ?? "");
  const form = useForm<ExpenseFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      spentOn: row?.spentOn ?? "",
      expenseTypeId: row?.expenseTypeId ?? "",
      unitAmount: row?.unitAmount ?? "",
      quantity: row?.quantity ?? "1.00",
      collaboratorId: row?.collaboratorId ?? "",
      notes: row?.notes ?? "",
    },
    resolver: (values) => {
      const result = validateExpenseFormValues(values, {
        expenseTypeIds: typeChoices.map((choice) => choice.id),
        collaboratorIds: collaboratorChoices.map((choice) => choice.id),
      });
      if (result.ok) return { values, errors: {} };
      return { values: {}, errors: rhfErrors(result.errors) };
    },
  });
  const watched = form.watch();
  const preview = validateExpenseFormValues(watched, {
    expenseTypeIds: typeChoices.map((choice) => choice.id),
    collaboratorIds: collaboratorChoices.map((choice) => choice.id),
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

  async function onSubmit(values: ExpenseFormValues) {
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
    body.set("spentOn", values.spentOn);
    body.set("expenseTypeId", values.expenseTypeId);
    body.set("unitAmount", values.unitAmount);
    body.set("quantity", values.quantity);
    body.set("collaboratorId", values.collaboratorId);
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
        if (field === "receipt") {
          setReceiptError(message);
          continue;
        }
        form.setError(field as keyof ExpenseFormValues, { message });
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
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="min-h-11 gap-2 px-4" onClick={onClose}>
            <X aria-hidden="true" />
            Cancelar
          </Button>
          <Button
            type="button"
            className="min-h-11 gap-2 px-4"
            disabled={pending}
            onClick={form.handleSubmit(onSubmit)}
          >
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
          name="spentOn"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field id="expense-spentOn" label="Fecha" error={fieldState.error?.message}>
              <DatePicker
                id="expense-spentOn"
                value={field.value}
                invalid={Boolean(fieldState.error)}
                onBlur={field.onBlur}
                onChange={field.onChange}
              />
            </Field>
          )}
        />
        <ChoiceField
          id="expense-type"
          label="Tipo"
          control={form.control}
          name="expenseTypeId"
          choices={typeChoices}
          error={form.formState.errors.expenseTypeId?.message}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormNumeric
            form={form}
            name="unitAmount"
            id="expense-amount"
            label="Importe"
            minimumFractionDigits={2}
            maximumFractionDigits={2}
          />
          <FormNumeric
            form={form}
            name="quantity"
            id="expense-quantity"
            label="Cantidad"
            symbol=""
            minimumFractionDigits={0}
            maximumFractionDigits={2}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Total {preview.ok ? formatExpenseMoney(preview.value.total) : "—"}
        </p>
        <ChoiceField
          id="expense-collaborator"
          label="Colaborador"
          control={form.control}
          name="collaboratorId"
          choices={collaboratorChoices}
          error={form.formState.errors.collaboratorId?.message}
        />
        <Field id="expense-notes" label="Observaciones" error={form.formState.errors.notes?.message}>
          <textarea
            id="expense-notes"
            rows={3}
            className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            {...form.register("notes")}
          />
        </Field>
        <FileUpload
          id="expense-receipt"
          label="Comprobante"
          hint={
            receiptStorageReady
              ? "JPG, PNG, WebP o PDF. Hasta 5 MB. Con comprobante, el gasto queda verificado."
              : receiptStorageUnavailableMessage
          }
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

function ChoiceField({
  id,
  label,
  control,
  name,
  choices,
  error,
}: {
  id: string;
  label: string;
  control: ReturnType<typeof useForm<ExpenseFormValues>>["control"];
  name: "expenseTypeId" | "collaboratorId";
  choices: readonly ExpenseChoice[];
  error?: string;
}) {
  const items = choices.map((choice) => ({ value: choice.id, label: choice.label }));
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field id={id} label={label} error={error}>
          <Select
            items={items}
            value={field.value || null}
            onValueChange={(next: string | null) => field.onChange(next ?? "")}
          >
            <SelectTrigger id={id} className={selectTriggerClass} onBlur={field.onBlur}>
              <SelectValue placeholder={`Elegí ${label.toLocaleLowerCase("es")}`} />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
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

function ReceiptPreview({ row, onClose }: { row: ExpenseRow; onClose: () => void }) {
  const href = `/api/expenses/${row.id}/receipt`;
  const image = receiptEmbedKind(row.receiptContentType) === "image";
  const [ready, setReady] = useState(false);
  const label = `Comprobante de ${row.expenseTypeDescription}`;

  useEffect(() => {
    setReady(false);
  }, [href]);

  return (
    <Modal
      open
      wide
      headerClose
      title="Comprobante"
      description={`${row.expenseTypeDescription} · ${formatExpenseDate(row.spentOn)} · ${formatExpenseMoney(rowTotal(row))} · ${row.collaboratorName}`}
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

function RowActions({
  label,
  hasReceipt,
  onViewReceipt,
  onEdit,
}: {
  label: string;
  hasReceipt: boolean;
  onViewReceipt: () => void;
  onEdit: () => void;
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
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={label}
        className="min-h-11 min-w-11"
        onClick={onClick}
      >
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

const overviewIcons: Record<ExpenseOverviewCard["id"], LucideIcon> = {
  "current-month": CalendarDays,
  "previous-month": CalendarRange,
  "six-months": ChartColumn,
  "current-year": CalendarDays,
};

const overviewTone: Record<ExpenseOverviewCard["id"], string> = {
  "current-month": "bg-status-active text-status-active-foreground",
  "previous-month": "bg-status-inactive text-status-inactive-foreground",
  "six-months": "bg-status-temporary text-status-temporary-foreground",
  "current-year": "bg-status-permanent text-status-permanent-foreground",
};

const overviewBar: Record<ExpenseOverviewCard["id"], string> = {
  "current-month": "bg-chart-2",
  "previous-month": "bg-chart-1",
  "six-months": "bg-chart-5",
  "current-year": "bg-chart-4",
};

function ExpenseOverview({
  overview,
  query,
}: {
  overview: readonly ExpenseOverviewCard[];
  query: ExpenseListQuery;
}) {
  return (
    <section aria-label="Panorama de gastos" className="pb-4">
      <h2 className="sr-only">Panorama de gastos</h2>
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

function OverviewCard({ card, selected }: { card: ExpenseOverviewCard; selected: boolean }) {
  const Icon = overviewIcons[card.id];
  const body = (
    <>
      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-1", overviewBar[card.id])} />
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Icon aria-hidden="true" className="size-3.5 shrink-0" />
        <span>{card.title}</span>
      </div>
      <p className="mt-2 text-lg font-semibold tracking-tight tabular-nums">
        {formatExpenseMoney(card.amount)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {card.period} · {card.count === 1 ? "1 gasto" : `${card.count} gastos`}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div
          className={cn("h-full rounded-full", overviewBar[card.id])}
          style={{ width: `${card.share}%` }}
        />
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
      href={expenseHref({
        text: "",
        status: "all",
        year: card.listPeriod.year,
        month: card.listPeriod.month,
        expenseTypeId: null,
        collaboratorId: null,
        page: 1,
      })}
      aria-current={selected ? "true" : undefined}
      className={className}
    >
      {body}
    </Link>
  );
}

function overviewSelected(card: ExpenseOverviewCard, query: ExpenseListQuery): boolean {
  if (!card.listPeriod) return false;
  if (query.text || query.status !== "all" || query.expenseTypeId || query.collaboratorId) {
    return false;
  }
  return query.year === card.listPeriod.year && query.month === card.listPeriod.month;
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={id}>
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      >
        {children}
      </select>
    </label>
  );
}

function ExpensePager({ query, pageCount }: { query: ExpenseListQuery; pageCount: number }) {
  const linkClass =
    "inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium";
  return (
    <nav aria-label="Páginas" className="flex items-center justify-between gap-3 pt-4">
      {query.page <= 1 ? (
        <span className={cn(linkClass, "text-muted-foreground")}>
          <ChevronLeft aria-hidden="true" className="size-4" />
          Anterior
        </span>
      ) : (
        <Link href={expenseHref({ ...query, page: query.page - 1 })} className={linkClass}>
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
        <Link href={expenseHref({ ...query, page: query.page + 1 })} className={linkClass}>
          Siguiente
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </nav>
  );
}

function expenseHref(query: ExpenseListQuery): string {
  return `/movements?${expenseListSearchParams(query)}`;
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <span
      role="img"
      aria-label={verified ? "Verificado" : "Pendiente"}
      title={verified ? "Verificado" : "Pendiente"}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full ring-2 ring-background select-none",
        verified
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground",
      )}
    >
      {verified ? <Check aria-hidden="true" className="size-3" strokeWidth={2.5} /> : null}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,6.5rem)_1fr] items-baseline gap-x-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{value}</dd>
    </div>
  );
}

function choicesFor(choices: readonly ExpenseChoice[], currentId: string) {
  return choices.filter((choice) => choice.active || choice.id === currentId);
}

function rowTotal(row: ExpenseRow): string {
  const parsed = validateExpenseFormValues(
    {
      spentOn: row.spentOn,
      expenseTypeId: row.expenseTypeId,
      unitAmount: row.unitAmount,
      quantity: row.quantity,
      collaboratorId: row.collaboratorId,
      notes: row.notes ?? "",
    },
    { expenseTypeIds: [row.expenseTypeId], collaboratorIds: [row.collaboratorId] },
  );
  return parsed.ok ? parsed.value.total : row.unitAmount;
}

function rhfErrors(errors: ExpenseFormErrors) {
  return Object.fromEntries(
    Object.entries(errors).flatMap(([key, message]) =>
      key === "receipt" || !message ? [] : [[key, { type: "validate", message }]],
    ),
  );
}
