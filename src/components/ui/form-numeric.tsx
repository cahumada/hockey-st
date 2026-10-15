"use client";

import { useState, type ComponentProps } from "react";
import { Controller, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { DollarSign, HelpCircle, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { NumericInput } from "@/components/ui/numeric-input";
import { parseNumericDraft } from "@/lib/numeric-format";

type FormNumericProps<T extends FieldValues> = Omit<
  ComponentProps<typeof NumericInput>,
  "value" | "onChange" | "name" | "form"
> & {
  label?: string;
  tooltip?: string;
  error?: string;
  name: FieldPath<T>;
  symbol?: string;
  symbolIcon?: LucideIcon;
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  form?: UseFormReturn<T>;
};

export function FormNumeric<T extends FieldValues>({
  label,
  tooltip,
  error,
  name,
  id,
  required,
  min = 0,
  max,
  symbol = "$",
  symbolIcon,
  minimumFractionDigits = 0,
  maximumFractionDigits = 0,
  className,
  form,
  locale = "es-AR",
  ...props
}: FormNumericProps<T>) {
  const inputId = id ?? String(name);
  const Icon = symbolIcon ?? (symbol === "$" ? DollarSign : undefined);
  const [standaloneValue, setStandaloneValue] = useState<number | undefined>(undefined);
  const caption = label ? (
    <span className="flex items-center gap-2">
      {label}
      {required ? " *" : null}
      {tooltip ? (
        <span className="group/icon relative inline-flex">
          <HelpCircle className="size-3.5 text-muted-foreground" aria-label={tooltip} />
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[0.6875rem] font-medium text-background opacity-0 shadow-sm group-hover/icon:opacity-100"
          >
            {tooltip}
          </span>
        </span>
      ) : null}
    </span>
  ) : null;

  if (form) {
    return (
      <Controller
        control={form.control}
        name={name}
        render={({ field, fieldState }) => {
          const parsed = parseNumericDraft(String(field.value ?? ""));
          const message = fieldState.error?.message ?? error;
          return (
            <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={inputId}>
              {caption}
              <NumericInput
                {...props}
                id={inputId}
                name={field.name}
                value={parsed ?? undefined}
                onChange={(next) =>
                  field.onChange(next === undefined ? "" : next.toFixed(maximumFractionDigits))
                }
                onBlur={field.onBlur}
                symbol={symbol}
                symbolIcon={Icon}
                symbolPosition="left"
                locale={locale}
                minimumFractionDigits={minimumFractionDigits}
                maximumFractionDigits={maximumFractionDigits}
                min={min}
                max={max}
                required={required}
                aria-invalid={Boolean(fieldState.error)}
                className={cn(fieldState.error && "border-destructive", className)}
              />
              {message ? <span className="text-xs font-normal text-destructive">{message}</span> : null}
            </label>
          );
        }}
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {caption ? (
        <label className="text-sm font-medium" htmlFor={inputId}>
          {caption}
        </label>
      ) : null}
      <NumericInput
        {...props}
        id={inputId}
        name={String(name)}
        value={standaloneValue}
        onChange={setStandaloneValue}
        symbol={symbol}
        symbolIcon={Icon}
        symbolPosition="left"
        locale={locale}
        minimumFractionDigits={minimumFractionDigits}
        maximumFractionDigits={maximumFractionDigits}
        min={min}
        max={max}
        required={required}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
