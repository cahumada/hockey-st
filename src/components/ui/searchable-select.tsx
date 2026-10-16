"use client";

import type { FocusEventHandler, ReactNode } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, X } from "lucide-react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  reference?: string;
  group?: string;
};

export type SearchableSelectGroup = {
  value: string;
  label: string;
};

type SharedProps = {
  id?: string;
  label: string;
  options: readonly SearchableSelectOption[];
  groups?: readonly SearchableSelectGroup[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  isFullLabel?: boolean;
  error?: string;
  container?: HTMLElement | null;
  renderOption?: (option: SearchableSelectOption) => ReactNode;
  onBlur?: FocusEventHandler<HTMLInputElement>;
};

export type SearchableSelectProps = SharedProps &
  (
    | {
        multiple?: false;
        value: string | null;
        leading?: ReactNode;
        onValueChange: (value: string | null) => void;
      }
    | {
        multiple: true;
        value: readonly string[];
        onValueChange: (value: string[]) => void;
      }
  );

type ComboboxGroup = {
  value: string;
  label: string;
  items: string[];
};

const popupClass =
  "max-h-60 w-(--anchor-width) min-w-36 overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10";
const itemClass =
  "relative flex min-h-11 cursor-default items-center rounded-md pr-8 pl-2 outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground";
const iconButtonClass = "inline-flex size-11 shrink-0 items-center justify-center text-muted-foreground";

export function SearchableSelect(props: SearchableSelectProps) {
  if (props.multiple) return <MultipleSearchableSelect {...props} />;
  return <SingleSearchableSelect {...props} />;
}

function SingleSearchableSelect({
  id,
  label,
  options,
  groups,
  value,
  onValueChange,
  placeholder = "Buscar…",
  disabled = false,
  required = false,
  isFullLabel = false,
  error,
  container,
  leading,
  renderOption,
  onBlur,
}: SharedProps & {
  multiple?: false;
  value: string | null;
  leading?: ReactNode;
  onValueChange: (value: string | null) => void;
}) {
  const labels = optionLabels(options, isFullLabel);
  const grouped = groupedItems(options, groups);
  const items = grouped ?? options.map((option) => option.value);
  const filter = Combobox.useFilter({ locale: "es" });

  return (
    <Combobox.Root
      items={items}
      modal={false}
      disabled={disabled}
      value={value}
      filter={filter.contains}
      itemToStringLabel={(item: string) => labels.get(item) ?? item}
      onValueChange={(next) => onValueChange(next)}
    >
      <Field label={label} required={required} error={error}>
        <div className="flex min-h-11 w-full items-center rounded-lg border border-input bg-background pr-1">
          {leading ? <span className="pl-2">{leading}</span> : null}
          <Combobox.Input
            id={id}
            placeholder={placeholder}
            onBlur={onBlur}
            className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Combobox.Clear aria-label="Quitar selección" className={iconButtonClass}>
            <X aria-hidden="true" className="size-4" />
          </Combobox.Clear>
          <Combobox.Trigger aria-label="Abrir opciones" className={iconButtonClass}>
            <ChevronDown aria-hidden="true" className="size-4" />
          </Combobox.Trigger>
        </div>
      </Field>
      <OptionPopup container={container} options={options} labels={labels} grouped={grouped} renderOption={renderOption} />
    </Combobox.Root>
  );
}

function MultipleSearchableSelect({
  id,
  label,
  options,
  groups,
  value,
  onValueChange,
  placeholder = "Buscar…",
  disabled = false,
  required = false,
  isFullLabel = false,
  error,
  container,
  renderOption,
  onBlur,
}: SharedProps & {
  multiple: true;
  value: readonly string[];
  onValueChange: (value: string[]) => void;
}) {
  const labels = optionLabels(options, isFullLabel);
  const grouped = groupedItems(options, groups);
  const items = grouped ?? options.map((option) => option.value);
  const filter = Combobox.useFilter({ multiple: true, locale: "es" });

  return (
    <Combobox.Root
      items={items}
      multiple
      modal={false}
      disabled={disabled}
      value={value}
      filter={filter.contains}
      itemToStringLabel={(item: string) => labels.get(item) ?? item}
      onValueChange={(next) => onValueChange([...next])}
    >
      <Field label={label} required={required} error={error}>
        <Combobox.Chips className="flex min-h-11 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-2 py-1">
          <Combobox.Value>
            {(selected: readonly string[]) =>
              selected.map((item) => (
                <Combobox.Chip
                  key={item}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                >
                  <span className="truncate">{labels.get(item) ?? item}</span>
                  <Combobox.ChipRemove
                    aria-label={`Quitar ${labels.get(item) ?? item}`}
                    className="inline-flex size-6 items-center justify-center rounded-md"
                  >
                    <X aria-hidden="true" className="size-3" />
                  </Combobox.ChipRemove>
                </Combobox.Chip>
              ))
            }
          </Combobox.Value>
          <Combobox.Input
            id={id}
            placeholder={value.length === 0 ? placeholder : "Buscar…"}
            onBlur={onBlur}
            className="h-9 min-w-16 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Combobox.Clear aria-label="Quitar selección" className={iconButtonClass}>
            <X aria-hidden="true" className="size-4" />
          </Combobox.Clear>
          <Combobox.Trigger aria-label="Abrir opciones" className={iconButtonClass}>
            <ChevronDown aria-hidden="true" className="size-4" />
          </Combobox.Trigger>
        </Combobox.Chips>
      </Field>
      <OptionPopup container={container} options={options} labels={labels} grouped={grouped} renderOption={renderOption} />
    </Combobox.Root>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Combobox.Label className="text-sm font-medium">
        {label}
        {required ? " *" : null}
      </Combobox.Label>
      {children}
      {error ? <span className="text-xs font-normal text-destructive">{error}</span> : null}
    </div>
  );
}

function OptionPopup({
  container,
  options,
  labels,
  grouped,
  renderOption,
}: {
  container?: HTMLElement | null;
  options: readonly SearchableSelectOption[];
  labels: ReadonlyMap<string, string>;
  grouped: readonly ComboboxGroup[] | null;
  renderOption?: (option: SearchableSelectOption) => ReactNode;
}) {
  const optionsByValue = new Map(options.map((option) => [option.value, option]));

  return (
    <Combobox.Portal container={container ?? undefined}>
      <Combobox.Positioner
        positionMethod="absolute"
        side="bottom"
        align="start"
        sideOffset={4}
        className="isolate z-[80]"
      >
        <Combobox.Popup className={popupClass} data-slot="popover-content">
          <Combobox.Empty className="px-2 py-3 text-sm text-muted-foreground">Sin resultados</Combobox.Empty>
          {grouped ? (
            <Combobox.List>
              {(group: ComboboxGroup) => (
                <Combobox.Group key={group.value} items={group.items}>
                  <Combobox.GroupLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {group.label}
                  </Combobox.GroupLabel>
                  <Combobox.Collection>
                    {(item: string) => (
                      <OptionItem
                        key={item}
                        item={item}
                        option={optionsByValue.get(item)}
                        label={labels.get(item) ?? item}
                        renderOption={renderOption}
                      />
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              )}
            </Combobox.List>
          ) : (
            <Combobox.List>
              {(item: string) => (
                <OptionItem
                  key={item}
                  item={item}
                  option={optionsByValue.get(item)}
                  label={labels.get(item) ?? item}
                  renderOption={renderOption}
                />
              )}
            </Combobox.List>
          )}
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  );
}

function OptionItem({
  item,
  option,
  label,
  renderOption,
}: {
  item: string;
  option?: SearchableSelectOption;
  label: string;
  renderOption?: (option: SearchableSelectOption) => ReactNode;
}) {
  return (
    <Combobox.Item value={item} className={itemClass}>
      <span className="flex min-w-0 flex-1 items-center">
        {renderOption && option ? renderOption(option) : <span className="truncate">{label}</span>}
      </span>
      <Combobox.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
        <Check aria-hidden="true" className="size-4" />
      </Combobox.ItemIndicator>
    </Combobox.Item>
  );
}

function optionLabels(options: readonly SearchableSelectOption[], isFullLabel: boolean): Map<string, string> {
  return new Map(options.map((option) => [option.value, displayLabel(option, isFullLabel)]));
}

function displayLabel(option: SearchableSelectOption, isFullLabel: boolean): string {
  if (isFullLabel && option.reference) return `${option.reference} - ${option.label}`;
  return option.label;
}

function groupedItems(
  options: readonly SearchableSelectOption[],
  groups: readonly SearchableSelectGroup[] | undefined,
): ComboboxGroup[] | null {
  if (!groups?.length && !options.some((option) => option.group)) return null;

  const buckets = new Map<string, string[]>();
  for (const option of options) {
    const key = option.group ?? "";
    const bucket = buckets.get(key);
    if (bucket) bucket.push(option.value);
    else buckets.set(key, [option.value]);
  }

  const ordered: ComboboxGroup[] = [];
  const seen = new Set<string>();
  for (const group of groups ?? []) {
    const items = buckets.get(group.value);
    if (!items?.length) continue;
    ordered.push({ value: group.value, label: group.label, items });
    seen.add(group.value);
  }
  for (const [key, items] of buckets) {
    if (seen.has(key) || items.length === 0) continue;
    ordered.push({ value: key || "ungrouped", label: key || "Sin categoría", items });
  }
  return ordered;
}
