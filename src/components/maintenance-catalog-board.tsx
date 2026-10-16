"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import type { MaintenanceCatalogActionState } from "@/app/(protected)/maintenance/actions";
import { statusMarkClass, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  browseMaintenanceCatalog,
  catalogStatusLabels,
  type CatalogBrowseStatus,
  type CatalogStatus,
} from "@/lib/maintenance-catalog";
import { cn } from "cn";

export type MaintenanceCatalogRow = {
  id: string;
  legacyId: number;
  description: string;
  status: CatalogStatus;
};

type CatalogFormAction = (
  previous: MaintenanceCatalogActionState,
  formData: FormData,
) => Promise<MaintenanceCatalogActionState>;

type Editor = { mode: "create" } | { mode: "edit"; rowId: string } | null;

const idleAction: MaintenanceCatalogActionState = { status: "idle", message: "" };

const fieldClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";
const selectTriggerClass = "h-11 w-full data-[size=default]:h-11";

const statusOptions: { value: CatalogBrowseStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

const entryStatusItems = [
  { value: "ACTIVE", label: catalogStatusLabels.ACTIVE },
  { value: "INACTIVE", label: catalogStatusLabels.INACTIVE },
] as const;

export function MaintenanceCatalogBoard({
  title,
  emptyLabel,
  emptyFilterLabel = "No hay tipos con ese filtro.",
  createButtonLabel = "Nuevo tipo",
  createTitle,
  createLabel,
  noun = ["tipo", "tipos"],
  rows,
  createAction,
  updateAction,
  removeAction,
  removeTitle = "Quitar",
  removeHint = "Se quita del listado.",
}: {
  title: string;
  emptyLabel: string;
  emptyFilterLabel?: string;
  createButtonLabel?: string;
  createTitle: string;
  createLabel: string;
  noun?: readonly [string, string];
  rows: readonly MaintenanceCatalogRow[];
  createAction: CatalogFormAction;
  updateAction: CatalogFormAction;
  removeAction?: CatalogFormAction;
  removeTitle?: string;
  removeHint?: string;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<CatalogBrowseStatus>("all");
  const [editor, setEditor] = useState<Editor>(null);
  const [removing, setRemoving] = useState<MaintenanceCatalogRow | null>(null);
  const result = useMemo(
    () => browseMaintenanceCatalog(rows, { text, status }),
    [rows, text, status],
  );
  const editing =
    editor?.mode === "edit" ? rows.find((row) => row.id === editor.rowId) ?? null : null;
  const filtersActive = text.trim().length > 0 || status !== "all";

  function clearFilters() {
    setText("");
    setStatus("all");
  }

  return (
    <div className="flex flex-col">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
            {catalogSummary(result.totals, noun)}
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 shrink-0 px-4"
          onClick={() => setEditor({ mode: "create" })}
        >
          {createButtonLabel}
        </Button>
      </header>
      <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="catalog-search">
            Buscar
            <input
              id="catalog-search"
              type="search"
              value={text}
              placeholder="Descripción o número"
              autoComplete="off"
              onChange={(event) => setText(event.target.value)}
              className={fieldClass}
            />
          </label>
          <fieldset className="flex shrink-0 items-center gap-2 border-0 p-0">
            <legend className="sr-only">Estado</legend>
            {statusOptions.map((option) => (
              <FilterButton
                key={option.value}
                pressed={status === option.value}
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </FilterButton>
            ))}
          </fieldset>
          {filtersActive ? (
            <div className="flex justify-end">
              <Button type="button" variant="outline" className="min-h-11 px-4" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="pt-4">
        {rows.length === 0 ? (
          <p>{emptyLabel}</p>
        ) : result.rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p>{emptyFilterLabel}</p>
            <Button type="button" className="min-h-11 px-4" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
              {result.rows.map((row) => (
                <li key={row.id} className="min-w-0">
                  <CatalogCard
                    row={row}
                    onEdit={() => setEditor({ mode: "edit", rowId: row.id })}
                    onRemove={removeAction ? () => setRemoving(row) : undefined}
                  />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <caption className="sr-only">{title}</caption>
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="border-b px-3 py-2 font-medium">Descripción</th>
                    <th className="border-b px-3 py-2 font-medium">Estado</th>
                    <th className="border-b px-3 py-2 font-medium">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.id}>
                      <th
                        scope="row"
                        className="relative border-b px-3 py-3 text-left font-semibold text-foreground"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute inset-y-0 left-0 w-1.5",
                            statusMarkClass(row.status === "INACTIVE" ? "inactive" : "active"),
                          )}
                        />
                        <span className="block pl-2">{row.description}</span>
                        <span className="block pl-2 text-xs font-normal text-muted-foreground">
                          Número {row.legacyId}
                        </span>
                      </th>
                      <td className="border-b px-3 py-3">
                        <CatalogStatusBadge status={row.status} />
                      </td>
                      <td className="border-b px-3 py-3">
                        <RowActions
                          description={row.description}
                          onEdit={() => setEditor({ mode: "edit", rowId: row.id })}
                          onRemove={removeAction ? () => setRemoving(row) : undefined}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {editor?.mode === "create" ? (
        <CatalogModal
          title={createTitle}
          saveLabel={createLabel}
          row={null}
          formAction={createAction}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {editing ? (
        <CatalogModal
          key={editing.id}
          title={editing.description}
          description={`Número ${editing.legacyId}`}
          saveLabel="Guardar cambios"
          row={editing}
          formAction={updateAction}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {removing && removeAction ? (
        <RemoveCatalogDialog
          row={removing}
          title={removeTitle}
          hint={removeHint}
          formAction={removeAction}
          onClose={() => setRemoving(null)}
        />
      ) : null}
    </div>
  );
}

function CatalogCard({
  row,
  onEdit,
  onRemove,
}: {
  row: MaintenanceCatalogRow;
  onEdit: () => void;
  onRemove?: () => void;
}) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1.5",
          statusMarkClass(row.status === "INACTIVE" ? "inactive" : "active"),
        )}
      />
      <div className="flex items-start justify-between gap-3 pt-4 pr-4 pl-5">
        <h2 className="min-w-0 text-base font-semibold leading-snug">{row.description}</h2>
        <CatalogStatusBadge status={row.status} />
      </div>
      <dl className="mt-3 pr-4 pl-5 text-sm">
        <Fact label="Número" value={String(row.legacyId)} />
      </dl>
      <div className="mt-auto px-2 py-2">
        <RowActions description={row.description} onEdit={onEdit} onRemove={onRemove} />
      </div>
    </article>
  );
}

function RowActions({
  description,
  onEdit,
  onRemove,
}: {
  description: string;
  onEdit: () => void;
  onRemove?: () => void;
}) {
  return (
    <div role="group" aria-label={`Acciones de ${description}`} className="flex justify-end gap-1">
      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Quitar ${description}`}
          className="min-h-11 min-w-11"
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Editar ${description}`}
        className="min-h-11 min-w-11"
        onClick={onEdit}
      >
        <Pencil aria-hidden="true" />
      </Button>
    </div>
  );
}

function RemoveCatalogDialog({
  row,
  title,
  hint,
  formAction,
  onClose,
}: {
  row: MaintenanceCatalogRow;
  title: string;
  hint: string;
  formAction: CatalogFormAction;
  onClose: () => void;
}) {
  const formId = `catalog-remove-${row.id}`;
  const [state, action, pending] = useActionState(formAction, idleAction);

  useEffect(() => {
    if (state.status === "saved") onClose();
  }, [state.status, onClose]);

  return (
    <Modal
      open
      title={title}
      description={row.description}
      onClose={() => {
        if (!pending) onClose();
      }}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-2 px-4"
            disabled={pending}
            onClick={onClose}
          >
            <X aria-hidden="true" />
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11 gap-2 px-4"
            disabled={pending}
            onClick={() => submitCatalogForm(formId)}
          >
            <Trash2 aria-hidden="true" />
            {pending ? "Quitando…" : "Quitar"}
          </Button>
        </div>
      }
    >
      <form id={formId} action={action} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={row.id} />
        <p className="text-sm text-muted-foreground">{hint}</p>
        <ActionNote state={state} />
      </form>
    </Modal>
  );
}

function CatalogModal({
  title,
  description,
  saveLabel,
  row,
  formAction,
  onClose,
}: {
  title: string;
  description?: string;
  saveLabel: string;
  row: MaintenanceCatalogRow | null;
  formAction: CatalogFormAction;
  onClose: () => void;
}) {
  const formId = row ? `catalog-edit-${row.id}` : "catalog-create";
  const [state, action, pending] = useActionState(formAction, idleAction);

  useEffect(() => {
    if (state.status === "saved") {
      onClose();
    }
  }, [state.status, onClose]);

  function requestClose() {
    if (!pending) {
      onClose();
    }
  }

  return (
    <Modal
      open
      title={title}
      description={description}
      onClose={requestClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 gap-2 px-4"
            disabled={pending}
            onClick={requestClose}
          >
            <X aria-hidden="true" />
            Cancelar
          </Button>
          <Button
            type="button"
            className="min-h-11 gap-2 px-4"
            disabled={pending}
            onClick={() => submitCatalogForm(formId)}
          >
            <Save aria-hidden="true" />
            {pending ? "Guardando…" : saveLabel}
          </Button>
        </div>
      }
    >
      <CatalogForm
        row={row}
        formId={formId}
        formAction={action}
        pending={pending}
        state={state}
      />
    </Modal>
  );
}

function CatalogForm({
  row,
  formId,
  formAction,
  pending,
  state,
}: {
  row: MaintenanceCatalogRow | null;
  formId: string;
  formAction: (payload: FormData) => void;
  pending: boolean;
  state: MaintenanceCatalogActionState;
}) {
  const [status, setStatus] = useState<CatalogStatus>(row?.status ?? "ACTIVE");

  return (
    <form id={formId} action={formAction} className="flex flex-col gap-3">
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={`${formId}-description`}>
        Descripción
        <input
          id={`${formId}-description`}
          name="description"
          defaultValue={row?.description ?? ""}
          className={fieldClass}
          disabled={pending}
          required
          maxLength={120}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={`${formId}-status`}>
        Estado
        <Select
          name="status"
          items={entryStatusItems}
          value={status}
          disabled={pending}
          onValueChange={(next: string | null) => {
            if (next === "ACTIVE" || next === "INACTIVE") {
              setStatus(next);
            }
          }}
        >
          <SelectTrigger id={`${formId}-status`} className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entryStatusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <ActionNote state={state} />
    </form>
  );
}

function submitCatalogForm(formId: string) {
  const form = document.getElementById(formId);
  if (form instanceof HTMLFormElement) {
    form.requestSubmit();
  }
}

function FilterButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        pressed ? "bg-primary text-primary-foreground" : "bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function CatalogStatusBadge({ status }: { status: CatalogStatus }) {
  return (
    <StatusBadge tone={status === "INACTIVE" ? "inactive" : "active"}>
      {catalogStatusLabels[status]}
    </StatusBadge>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] items-baseline gap-x-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{value}</dd>
    </div>
  );
}

function ActionNote({ state }: { state: MaintenanceCatalogActionState }) {
  if (!state.message || state.status === "saved") {
    return null;
  }

  return (
    <p aria-live="polite" className={cn("text-sm", state.status === "error" && "text-destructive")}>
      {state.message}
    </p>
  );
}

function catalogSummary(
  totals: { shown: number; active: number; inactive: number },
  noun: readonly [string, string],
): string {
  return [
    countLabel(totals.shown, noun[0], noun[1]),
    countLabel(totals.active, "activo", "activos"),
    countLabel(totals.inactive, "inactivo", "inactivos"),
  ].join(" · ");
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
