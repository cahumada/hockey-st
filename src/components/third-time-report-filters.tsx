"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const selectTriggerClass = "h-11 w-full data-[size=default]:h-11";

export function ThirdTimeReportFilters({
  year,
  categoryCode,
  categories,
  years,
}: {
  year: number;
  categoryCode: string | null;
  categories: readonly { value: string; label: string }[];
  years: readonly { value: string; label: string }[];
}) {
  const router = useRouter();

  function visit(category: string | null, nextYear: number) {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    params.set("year", String(nextYear));
    router.push(`/reports/third-time?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-medium" htmlFor="third-time-report-category">
        Categoría
        <Select
          items={categories}
          value={categoryCode}
          onValueChange={(next: string | null) => {
            if (next) visit(next, year);
          }}
        >
          <SelectTrigger id="third-time-report-category" className={selectTriggerClass}>
            <SelectValue placeholder="Elegí una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="flex w-full flex-col gap-1 text-sm font-medium sm:w-36" htmlFor="third-time-report-year">
        Año
        <Select
          items={years}
          value={String(year)}
          onValueChange={(next: string | null) => {
            if (next) visit(categoryCode, Number(next));
          }}
        >
          <SelectTrigger id="third-time-report-year" className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}
