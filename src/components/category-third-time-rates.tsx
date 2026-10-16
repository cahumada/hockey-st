"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, SlidersHorizontal, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { cn } from "cn";
import type { CategoryRateActionState } from "@/app/(protected)/categories/third-time/actions";
import { statusMarkClass, StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormNumeric } from "@/components/ui/form-numeric";
import { Modal } from "@/components/ui/modal";
import {
  planCategoryRateChange,
  type CategoryRateChangeInput,
} from "@/lib/category-third-time-rate";
import { formatExpenseDate, formatExpenseMoney } from "@/lib/expenses";

export type CategoryRateHistoryEntry = {
  id: string;
  previousAmount: string | null;
  amount: string;
  updatedOn: string;
  note: string | null;
  actor: string;
};

export type CategoryRateRow = {
  code: string;
  label: string;
  active: boolean;
  amount: string | null;
  updatedOn: string | null;
  history: CategoryRateHistoryEntry[];
};

type RateFormValues = CategoryRateChangeInput;

const fieldClass = "min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

export function CategoryThirdTimeRates({
  categories,
  today,
  updateAction,
}: {
  categories: readonly CategoryRateRow[];
  today: string;
  updateAction: (formData: FormData) => Promise<CategoryRateActionState>;
}) {
  const [editing, setEditing] = useState<CategoryRateRow | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Link
          href="/categories"
          className={cn(buttonVariants({ variant: "ghost" }), "w-fit min-h-11 gap-2 px-3")}
        >
          <ArrowLeft aria-hidden="true" />
          Categorías
        </Link>
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Monto del 3er tiempo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El importe vigente de cada categoría. Cada ajuste queda en el historial y no cambia las cuotas ya cargadas.
          </p>
        </header>
      </div>
      {categories.length === 0 ? (
        <p>No hay categorías cargadas.</p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {categories.map((category) => (
              <li key={category.code}>
                <article className="relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-0 left-0 w-1.5",
                      statusMarkClass(category.active ? "active" : "inactive"),
                    )}
                  />
                  <div className="flex items-start justify-between gap-3 pl-2">
                    <h2 className="text-base font-semibold">{category.label}</h2>
                    <div className="flex items-center gap-1">
                      <StatusBadge tone={category.active ? "active" : "inactive"}>
                        {category.active ? "Activa" : "Inactiva"}
                      </StatusBadge>
                      <AdjustAction categoryLabel={category.label} onClick={() => setEditing(category)} />
                    </div>
                  </div>
                  <dl className="flex flex-col gap-1 pl-2 text-sm">
                    <Fact label="Importe" value={moneyLabel(category.amount)} />
                    <Fact label="Actualizado" value={dateLabel(category.updatedOn)} />
                  </dl>
                </article>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
              <caption className="sr-only">Montos del 3er tiempo por categoría</caption>
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="border-b px-3 py-2 font-medium">Categoría</th>
                  <th className="border-b px-3 py-2 font-medium">Importe vigente</th>
                  <th className="border-b px-3 py-2 font-medium">Actualizado</th>
                  <th className="border-b px-3 py-2 font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.code}>
                    <th scope="row" className="relative border-b px-3 py-3 text-left font-semibold">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-y-0 left-0 w-1.5",
                          statusMarkClass(category.active ? "active" : "inactive"),
                        )}
                      />
                      <span className="pl-2">{category.label}</span>
                    </th>
                    <td className="border-b px-3 py-3">{moneyLabel(category.amount)}</td>
                    <td className="border-b px-3 py-3">{dateLabel(category.updatedOn)}</td>
                    <td className="border-b px-3 py-3 text-right">
                      <AdjustAction categoryLabel={category.label} onClick={() => setEditing(category)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {editing ? (
        <AdjustModal
          category={editing}
          today={today}
          updateAction={updateAction}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function AdjustModal({
  category,
  today,
  updateAction,
  onClose,
}: {
  category: CategoryRateRow;
  today: string;
  updateAction: (formData: FormData) => Promise<CategoryRateActionState>;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const form = useForm<RateFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { amount: "", updatedOn: today, note: "" },
    resolver: (values) => {
      const result = planCategoryRateChange({ amount: category.amount }, values, today);
      if (result.ok) return { values, errors: {} };
      return { values: {}, errors: rhfErrors(result.errors) };
    },
  });

  async function onSubmit(values: RateFormValues) {
    setFormMessage("");
    const body = new FormData();
    body.set("categoryCode", category.code);
    body.set("amount", values.amount.trim());
    body.set("updatedOn", values.updatedOn);
    body.set("note", values.note);
    setPending(true);
    try {
      const state = await updateAction(body);
      if (state.status === "saved") {
        onClose();
        return;
      }
      setFormMessage(state.message);
      for (const [field, message] of Object.entries(state.errors ?? {})) {
        if (!message || field === "form") continue;
        form.setError(field as keyof RateFormValues, { message });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open
      title={`Ajustar ${category.label}`}
      description={`Importe vigente: ${moneyLabel(category.amount)}.`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="min-h-11 gap-2 px-4" onClick={onClose}>
            <X aria-hidden="true" />
            Cancelar
          </Button>
          <Button type="button" className="min-h-11 gap-2 px-4" disabled={pending} onClick={form.handleSubmit(onSubmit)}>
            <Save aria-hidden="true" />
            {pending ? "Guardando…" : "Guardar ajuste"}
          </Button>
        </div>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        {formMessage ? (
          <p aria-live="polite" className="text-sm text-destructive">
            {formMessage}
          </p>
        ) : null}
        <FormNumeric
          form={form}
          name="amount"
          id="category-rate-amount"
          label="Importe nuevo"
          minimumFractionDigits={2}
          maximumFractionDigits={2}
        />
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="category-rate-date">
          Fecha
          <DatePicker
            id="category-rate-date"
            value={form.watch("updatedOn")}
            invalid={Boolean(form.formState.errors.updatedOn)}
            onBlur={() => form.trigger("updatedOn")}
            onChange={(value) => form.setValue("updatedOn", value, { shouldDirty: true, shouldValidate: true })}
          />
          {form.formState.errors.updatedOn?.message ? (
            <span className="text-xs font-normal text-destructive">{form.formState.errors.updatedOn.message}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="category-rate-note">
          Nota
          <textarea
            id="category-rate-note"
            rows={3}
            className={fieldClass}
            {...form.register("note")}
          />
          {form.formState.errors.note?.message ? (
            <span className="text-xs font-normal text-destructive">{form.formState.errors.note.message}</span>
          ) : null}
        </label>
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Historial</h3>
          {category.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay ajustes.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {category.history.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-border/70 px-3 py-2 text-sm">
                  <p className="font-medium">
                    {moneyLabel(entry.previousAmount)} → {formatExpenseMoney(entry.amount)}
                  </p>
                  <p className="text-muted-foreground">
                    {formatExpenseDate(entry.updatedOn)} · {entry.actor}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </form>
    </Modal>
  );
}

function AdjustAction({ categoryLabel, onClick }: { categoryLabel: string; onClick: () => void }) {
  const label = `Ajustar ${categoryLabel}`;
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
        <SlidersHorizontal aria-hidden="true" />
      </Button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 bottom-full z-20 mb-1.5 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[0.6875rem] font-medium text-background opacity-0 shadow-sm transition-opacity group-hover/icon:opacity-100 group-focus-within/icon:opacity-100"
      >
        Ajustar
      </span>
    </span>
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

function moneyLabel(amount: string | null): string {
  return amount ? formatExpenseMoney(amount) : "Sin monto";
}

function dateLabel(isoDate: string | null): string {
  return isoDate ? formatExpenseDate(isoDate) : "Sin fecha";
}

function rhfErrors(errors: Partial<Record<string, string>>) {
  return Object.fromEntries(
    Object.entries(errors).flatMap(([key, message]) => (message ? [[key, { type: "validate", message }]] : [])),
  );
}
