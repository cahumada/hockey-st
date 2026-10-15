"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCategoryLabel, sortCategories, type RosterCategory } from "@/lib/roster";

const triggerClass = "h-11 w-full data-[size=default]:h-11";

export function CategorySelect({
  id,
  label = "Categoría",
  categories,
  value,
  onValueChange,
  name,
  disabled,
  allowAll = false,
  allowNone = false,
  invalid = false,
  onBlur,
}: {
  id: string;
  label?: string;
  categories: readonly RosterCategory[];
  value: string;
  onValueChange?: (value: string) => void;
  name?: string;
  disabled?: boolean;
  allowAll?: boolean;
  allowNone?: boolean;
  invalid?: boolean;
  onBlur?: () => void;
}) {
  const items = [
    ...(allowAll ? [{ value: "all", label: "Todas" }] : []),
    ...(allowNone ? [{ value: "none", label: "Sin categoría" }] : []),
    ...sortCategories(categories).map((category) => ({
      value: category.code,
      label: formatCategoryLabel(category),
    })),
  ];

  return (
    <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={id}>
      {label}
      <Select
        name={name}
        items={items}
        value={value}
        disabled={disabled}
        onValueChange={(next: string | null) => {
          if (next !== null) {
            onValueChange?.(next);
          }
        }}
      >
        <SelectTrigger
          id={id}
          className={triggerClass}
          aria-invalid={invalid ? true : undefined}
          onBlur={onBlur}
        >
          <SelectValue />
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
