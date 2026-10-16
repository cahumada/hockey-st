"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link2, Pencil, Save, X } from "lucide-react";
import {
  createCollaborator,
  updateCollaboratorLink,
  updateCollaboratorProfile,
  type CollaboratorActionState,
} from "@/app/(protected)/collaborators/actions";
import { roleLabels } from "@/components/capability-links";
import { CategorySelect } from "@/components/category-select";
import { statusMarkClass, StatusBadge as ClubStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Role } from "@/lib/access";
import { browseCollaborators, type CollaboratorBrowseStatus } from "@/lib/collaborator-browse";
import {
  assignableRoles,
  collaboratorKindLabels,
  collaboratorKinds,
  collaboratorStatusLabels,
} from "@/lib/collaborators";
import type { CollaboratorKind, CollaboratorStatus } from "@/lib/legacy-collaborators";
import { cn } from "cn";

export type CollaboratorBoardPerson = {
  id: string;
  legacyId: number;
  displayName: string;
  givenName: string | null;
  familyName: string | null;
  kind: CollaboratorKind;
  categoryCode: string | null;
  categoryLabel: string;
  status: CollaboratorStatus;
  statusChangedOn: string | null;
  statusDateLabel: string | null;
  accountLabel: string;
  role: Role | null;
  userId: string | null;
};

export type CollaboratorCategoryOption = {
  code: string;
  description: string;
};

export type CollaboratorAccountOption = {
  id: string;
  label: string;
  linkedCollaboratorId: string | null;
};

type Editor =
  | { mode: "create" }
  | { mode: "profile"; personId: string }
  | { mode: "link"; personId: string }
  | null;

const idleAction: CollaboratorActionState = { status: "idle", message: "" };

const fieldClass = "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";
const missingNameLabel = "no informa";

function collaboratorLegalName(person: {
  givenName: string | null;
  familyName: string | null;
}): string {
  const parts = [person.givenName?.trim(), person.familyName?.trim()].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length > 0 ? parts.join(" ") : missingNameLabel;
}
const selectTriggerClass = "h-11 w-full data-[size=default]:h-11";

const statusOptions: { value: CollaboratorBrowseStatus; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

export function CollaboratorBoard({
  collaborators,
  categories,
  accounts,
  canAssignRoles,
}: {
  collaborators: readonly CollaboratorBoardPerson[];
  categories: readonly CollaboratorCategoryOption[];
  accounts: readonly CollaboratorAccountOption[];
  canAssignRoles: boolean;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<CollaboratorBrowseStatus>("all");
  const [kind, setKind] = useState<CollaboratorKind | null>(null);
  const [category, setCategory] = useState<"all" | "none" | string>("all");
  const [editor, setEditor] = useState<Editor>(null);
  const result = useMemo(
    () =>
      browseCollaborators(collaborators, {
        text,
        status,
        kind,
        category,
      }),
    [collaborators, text, status, kind, category],
  );
  const editing =
    editor && editor.mode !== "create"
      ? collaborators.find((person) => person.id === editor.personId) ?? null
      : null;
  const filtersActive = text.trim().length > 0 || status !== "all" || kind !== null || category !== "all";

  function clearFilters() {
    setText("");
    setStatus("all");
    setKind(null);
    setCategory("all");
  }

  return (
    <div className="flex flex-col">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Colaboradores</h1>
          <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
            {directorySummary(result.totals)}
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 shrink-0 px-4"
          onClick={() => setEditor({ mode: "create" })}
        >
          Nuevo colaborador
        </Button>
      </header>
      <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="collaborator-search">
            Buscar
            <input
              id="collaborator-search"
              type="search"
              value={text}
              placeholder="Nombre o legajo"
              autoComplete="off"
              onChange={(event) => setText(event.target.value)}
              className={fieldClass}
            />
          </label>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
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
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <ChoiceSelect
                id="collaborator-kind"
                label="Tipo"
                value={kind ?? "all"}
                items={[
                  { value: "all", label: "Todos" },
                  ...collaboratorKinds.map((item) => ({
                    value: item,
                    label: collaboratorKindLabels[item],
                  })),
                ]}
                onValueChange={(next) => setKind(next === "all" ? null : (next as CollaboratorKind))}
              />
              <CategorySelect
                id="collaborator-category"
                categories={categories}
                value={category}
                allowAll
                allowNone
                onValueChange={setCategory}
              />
            </div>
          </div>
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
        {collaborators.length === 0 ? (
          <p>No hay colaboradores.</p>
        ) : result.people.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p>No hay colaboradores con ese filtro.</p>
            <Button type="button" className="min-h-11 px-4" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
              {result.people.map((person) => (
                <li key={person.id} className="min-w-0">
                  <CollaboratorSummary
                    person={person}
                    canAssignRoles={canAssignRoles}
                    onEdit={() => setEditor({ mode: "profile", personId: person.id })}
                    onLink={() => setEditor({ mode: "link", personId: person.id })}
                  />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-sm">
                <caption className="sr-only">Directorio de colaboradores</caption>
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="border-b px-3 py-2 font-medium">Nombre</th>
                    <th className="border-b px-3 py-2 font-medium">Tipo</th>
                    <th className="border-b px-3 py-2 font-medium">Categoría</th>
                    <th className="border-b px-3 py-2 font-medium">Estado</th>
                    <th className="border-b px-3 py-2 font-medium">Cuenta</th>
                    <th className="border-b px-3 py-2 font-medium">Rol</th>
                    <th className="border-b px-3 py-2 font-medium">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.people.map((person) => (
                    <tr key={person.id}>
                      <th scope="row" className="relative border-b px-3 py-3 text-left font-semibold text-foreground">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "absolute inset-y-0 left-0 w-1.5",
                            statusMarkClass(person.status === "INACTIVE" ? "inactive" : "active"),
                          )}
                        />
                        <span className="block pl-2">{person.displayName}</span>
                        <span className="block pl-2 text-xs font-normal text-muted-foreground">
                          {collaboratorLegalName(person)}
                        </span>
                      </th>
                      <td className="border-b px-3 py-3">{collaboratorKindLabels[person.kind]}</td>
                      <td className="border-b px-3 py-3">{person.categoryLabel}</td>
                      <td className="border-b px-3 py-3">
                        <StatusBadge status={person.status} dateLabel={person.statusDateLabel} />
                      </td>
                      <td className="border-b px-3 py-3">{person.accountLabel}</td>
                      <td className="border-b px-3 py-3">
                        {person.role ? roleLabels[person.role] : "Sin rol"}
                      </td>
                      <td className="border-b px-3 py-3">
                        <RowActions
                          person={person}
                          canAssignRoles={canAssignRoles}
                          onEdit={() => setEditor({ mode: "profile", personId: person.id })}
                          onLink={() => setEditor({ mode: "link", personId: person.id })}
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
        <CreateModal categories={categories} onClose={() => setEditor(null)} />
      ) : null}
      {editing && editor?.mode === "profile" ? (
        <ProfileModal
          key={editing.id}
          person={editing}
          categories={categories}
          onClose={() => setEditor(null)}
        />
      ) : null}
      {editing && editor?.mode === "link" && canAssignRoles ? (
        <LinkModal
          key={editing.id}
          person={editing}
          accounts={accounts}
          onClose={() => setEditor(null)}
        />
      ) : null}
    </div>
  );
}

function CollaboratorSummary({
  person,
  canAssignRoles,
  onEdit,
  onLink,
}: {
  person: CollaboratorBoardPerson;
  canAssignRoles: boolean;
  onEdit: () => void;
  onLink: () => void;
}) {
  const inactive = person.status === "INACTIVE";

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1.5",
          statusMarkClass(inactive ? "inactive" : "active"),
        )}
      />
      <div className="flex items-start justify-between gap-3 pt-4 pr-4 pl-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug">{person.displayName}</h2>
          <p className="text-xs text-muted-foreground">{collaboratorLegalName(person)}</p>
        </div>
        <StatusBadge status={person.status} dateLabel={person.statusDateLabel} />
      </div>
      <dl className="mt-3 flex flex-col gap-1 pr-4 pl-5 text-sm">
        <Fact label="Tipo" value={collaboratorKindLabels[person.kind]} />
        <Fact label="Categoría" value={person.categoryLabel} />
        <Fact label="Cuenta" value={person.accountLabel} />
        <Fact label="Rol" value={person.role ? roleLabels[person.role] : "Sin rol"} />
      </dl>
      <div className="mt-auto px-2 py-2">
        <RowActions
          person={person}
          canAssignRoles={canAssignRoles}
          onEdit={onEdit}
          onLink={onLink}
        />
      </div>
    </article>
  );
}

function RowActions({
  person,
  canAssignRoles,
  onEdit,
  onLink,
}: {
  person: CollaboratorBoardPerson;
  canAssignRoles: boolean;
  onEdit: () => void;
  onLink: () => void;
}) {
  return (
    <div role="group" aria-label={`Acciones de ${person.displayName}`} className="flex justify-end gap-1">
      <IconAction label={`Editar a ${person.displayName}`} onClick={onEdit}>
        <Pencil aria-hidden="true" />
      </IconAction>
      {canAssignRoles ? (
        <IconAction label={`Vincular la cuenta de ${person.displayName}`} onClick={onLink}>
          <Link2 aria-hidden="true" />
        </IconAction>
      ) : null}
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
  );
}

function CreateModal({
  categories,
  onClose,
}: {
  categories: readonly CollaboratorCategoryOption[];
  onClose: () => void;
}) {
  const formId = "collaborator-create";
  const [state, formAction, pending] = useActionState(createCollaborator, idleAction);

  useEffect(() => {
    if (state.status === "saved") {
      onClose();
    }
  }, [state.status, onClose]);

  return (
    <Modal
      open
      title="Nuevo colaborador"
      description="El legajo se asigna al guardar. La cuenta se vincula después."
      onClose={onClose}
      footer={
        <ModalFooter
          pending={pending}
          onClose={onClose}
          formId={formId}
          saveLabel="Crear colaborador"
        />
      }
    >
      <ProfileForm
        person={null}
        categories={categories}
        formId={formId}
        formAction={formAction}
        pending={pending}
        state={state}
      />
    </Modal>
  );
}

function ProfileModal({
  person,
  categories,
  onClose,
}: {
  person: CollaboratorBoardPerson;
  categories: readonly CollaboratorCategoryOption[];
  onClose: () => void;
}) {
  const formId = `collaborator-profile-${person.id}`;
  const [state, formAction, pending] = useActionState(updateCollaboratorProfile, idleAction);

  useEffect(() => {
    if (state.status === "saved") {
      onClose();
    }
  }, [state.status, onClose]);

  return (
    <Modal
      open
      title={person.displayName}
      description={`Legajo ${person.legacyId}`}
      onClose={onClose}
      footer={
        <ModalFooter
          pending={pending}
          onClose={onClose}
          formId={formId}
          saveLabel="Guardar cambios"
        />
      }
    >
      <ProfileForm
        person={person}
        categories={categories}
        formId={formId}
        formAction={formAction}
        pending={pending}
        state={state}
      />
    </Modal>
  );
}

function ProfileForm({
  person,
  categories,
  formId,
  formAction,
  pending,
  state,
}: {
  person: CollaboratorBoardPerson | null;
  categories: readonly CollaboratorCategoryOption[];
  formId: string;
  formAction: (payload: FormData) => void;
  pending: boolean;
  state: CollaboratorActionState;
}) {
  const [status, setStatus] = useState<CollaboratorStatus>(person?.status ?? "ACTIVE");
  const [categoryCode, setCategoryCode] = useState(person?.categoryCode ?? "");

  return (
    <form id={formId} action={formAction} className="flex flex-col gap-3">
      {person ? <input type="hidden" name="collaboratorId" value={person.id} /> : null}
      <input type="hidden" name="categoryCode" value={categoryCode} />
      <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={`${formId}-display-name`}>
        Alias
        <input
          id={`${formId}-display-name`}
          name="displayName"
          defaultValue={person?.displayName ?? ""}
          className={fieldClass}
          disabled={pending}
          required
          maxLength={80}
          autoComplete="nickname"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={`${formId}-given-name`}>
          Nombre
          <input
            id={`${formId}-given-name`}
            name="givenName"
            defaultValue={person?.givenName ?? ""}
            className={fieldClass}
            disabled={pending}
            maxLength={80}
            autoComplete="given-name"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={`${formId}-family-name`}>
          Apellido
          <input
            id={`${formId}-family-name`}
            name="familyName"
            defaultValue={person?.familyName ?? ""}
            className={fieldClass}
            disabled={pending}
            maxLength={80}
            autoComplete="family-name"
          />
        </label>
      </div>
      <ChoiceSelect
        id={`${formId}-kind`}
        label="Tipo"
        name="kind"
        defaultValue={person?.kind}
        disabled={pending}
        required={person === null}
        placeholder={person === null ? "Elegí un tipo" : undefined}
        items={collaboratorKinds.map((kind) => ({
          value: kind,
          label: collaboratorKindLabels[kind],
        }))}
      />
      <CategorySelect
        id={`${formId}-category`}
        categories={categories}
        value={categoryCode === "" ? "none" : categoryCode}
        allowNone
        disabled={pending}
        onValueChange={(next) => setCategoryCode(next === "none" ? "" : next)}
      />
      <ChoiceSelect
        id={`${formId}-status`}
        label="Estado"
        name="status"
        value={status}
        disabled={pending}
        items={[
          { value: "ACTIVE", label: collaboratorStatusLabels.ACTIVE },
          { value: "INACTIVE", label: collaboratorStatusLabels.INACTIVE },
        ]}
        onValueChange={(next) => setStatus(next as CollaboratorStatus)}
      />
      {status === "INACTIVE" ? (
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={`${formId}-date`}>
          Fecha del estado
          <input
            id={`${formId}-date`}
            name="statusChangedOn"
            type="date"
            defaultValue={person?.statusChangedOn ?? ""}
            className={fieldClass}
            disabled={pending}
            required
          />
        </label>
      ) : (
        <input type="hidden" name="statusChangedOn" value="" />
      )}
      <ActionNote state={state} />
    </form>
  );
}

function LinkModal({
  person,
  accounts,
  onClose,
}: {
  person: CollaboratorBoardPerson;
  accounts: readonly CollaboratorAccountOption[];
  onClose: () => void;
}) {
  const formId = `collaborator-link-${person.id}`;
  const unlinkFormId = `collaborator-unlink-${person.id}`;
  const selectable = accounts.filter(
    (account) => account.linkedCollaboratorId === null || account.linkedCollaboratorId === person.id,
  );
  const [state, formAction, pending] = useActionState(updateCollaboratorLink, idleAction);
  const [unlinkState, unlinkAction, unlinkPending] = useActionState(updateCollaboratorLink, idleAction);
  const busy = pending || unlinkPending;

  useEffect(() => {
    if (state.status === "saved" || unlinkState.status === "saved") {
      onClose();
    }
  }, [state.status, unlinkState.status, onClose]);

  return (
    <Modal
      open
      title={`Cuenta de ${person.displayName}`}
      description={`Legajo ${person.legacyId}`}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="min-h-11 gap-2 px-4" onClick={onClose}>
            <X aria-hidden="true" />
            Cancelar
          </Button>
          {person.userId ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 px-4"
              disabled={busy}
              onClick={() => submitCollaboratorForm(unlinkFormId)}
            >
              {unlinkPending ? "Guardando…" : "Desvincular"}
            </Button>
          ) : null}
          <Button
            type="button"
            className="min-h-11 gap-2 px-4"
            disabled={busy}
            onClick={() => submitCollaboratorForm(formId)}
          >
            <Link2 aria-hidden="true" />
            {pending ? "Guardando…" : "Vincular cuenta"}
          </Button>
        </div>
      }
    >
      <form id={formId} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="collaboratorId" value={person.id} />
        <ChoiceSelect
          id={`${formId}-user`}
          label="Cuenta"
          name="userId"
          defaultValue={person.userId}
          disabled={busy}
          required
          placeholder="Elegí una cuenta"
          items={selectable.map((account) => ({ value: account.id, label: account.label }))}
        />
        <ChoiceSelect
          id={`${formId}-role`}
          label="Rol"
          name="role"
          defaultValue={person.role ?? "VISITOR"}
          disabled={busy}
          items={assignableRoles.map((role) => ({ value: role, label: roleLabels[role] }))}
        />
        <ActionNote state={state} />
      </form>
      {person.userId ? (
        <form id={unlinkFormId} action={unlinkAction}>
          <input type="hidden" name="collaboratorId" value={person.id} />
          <input type="hidden" name="userId" value="" />
          <input type="hidden" name="role" value="" />
          <ActionNote state={unlinkState} />
        </form>
      ) : null}
    </Modal>
  );
}

function submitCollaboratorForm(formId: string) {
  const form = document.getElementById(formId);
  if (form instanceof HTMLFormElement) {
    form.requestSubmit();
  }
}

function ModalFooter({
  pending,
  onClose,
  formId,
  saveLabel,
}: {
  pending: boolean;
  onClose: () => void;
  formId: string;
  saveLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" className="min-h-11 gap-2 px-4" onClick={onClose}>
        <X aria-hidden="true" />
        Cancelar
      </Button>
      <Button
        type="button"
        className="min-h-11 gap-2 px-4"
        disabled={pending}
        onClick={() => submitCollaboratorForm(formId)}
      >
        <Save aria-hidden="true" />
        {pending ? "Guardando…" : saveLabel}
      </Button>
    </div>
  );
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

function ChoiceSelect({
  id,
  label,
  name,
  items,
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  placeholder,
}: {
  id: string;
  label: string;
  name?: string;
  items: readonly { value: string; label: string }[];
  value?: string;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={id}>
      {label}
      <Select
        name={name}
        items={items}
        disabled={disabled}
        required={required}
        {...(value !== undefined ? { value } : { defaultValue })}
        onValueChange={(next: string | null) => {
          if (next !== null) {
            onValueChange?.(next);
          }
        }}
      >
        <SelectTrigger id={id} className={selectTriggerClass}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function StatusBadge({
  status,
  dateLabel,
}: {
  status: CollaboratorStatus;
  dateLabel: string | null;
}) {
  const inactive = status === "INACTIVE";

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <ClubStatusBadge tone={inactive ? "inactive" : "active"}>
        {collaboratorStatusLabels[status]}
      </ClubStatusBadge>
      {dateLabel ? <span className="text-xs text-muted-foreground">{dateLabel}</span> : null}
    </span>
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

function ActionNote({ state }: { state: CollaboratorActionState }) {
  if (!state.message || state.status === "saved") {
    return null;
  }

  return (
    <p aria-live="polite" className={cn("text-sm", state.status === "error" && "text-destructive")}>
      {state.message}
    </p>
  );
}

function directorySummary(totals: { shown: number; active: number; inactive: number }): string {
  return [
    countLabel(totals.shown, "persona", "personas"),
    countLabel(totals.active, "activa", "activas"),
    countLabel(totals.inactive, "inactiva", "inactivas"),
  ].join(" · ");
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
