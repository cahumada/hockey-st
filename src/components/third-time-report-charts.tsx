"use client";

import { useState } from "react";
import { formatExpenseMoney } from "@/lib/expenses";
import { thirdTimeStatusLabels } from "@/lib/third-time";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  thirdTimeCollectionComparison,
  thirdTimeReportMonthLabels,
  type ThirdTimeCategoryReport,
  type ThirdTimeMonthStatusMix,
  type ThirdTimeReportFeeStatus,
} from "@/lib/third-time-report";
import { cn } from "cn";

const barClass: Record<ThirdTimeReportFeeStatus, string> = {
  PAID: "bg-status-active text-status-active-foreground",
  PENDING: "bg-status-temporary text-status-temporary-foreground",
  EXEMPT: "bg-status-inactive text-status-inactive-foreground",
};

const selectTriggerClass = "h-11 w-full data-[size=default]:h-11";

const monthItems = thirdTimeReportMonthLabels.map((label, index) => ({
  value: String(index + 1),
  label: label.fullName,
}));

export function ThirdTimeReportCharts({
  initialMonth,
  playerCount,
  categoryAmount,
  report,
}: {
  initialMonth: number;
  playerCount: number;
  categoryAmount: string | null;
  report: ThirdTimeCategoryReport;
}) {
  const [month, setMonth] = useState(initialMonth);
  const selectedIndex = month - 1;
  const selectedMonth = report.months[selectedIndex];
  const comparison = thirdTimeCollectionComparison({
    playerCount,
    categoryAmount,
    collected: report.collectedByMonth[selectedIndex] ?? "0.00",
  });
  const playersLabel = playerCount === 1 ? "1 jugadora" : `${playerCount} jugadoras`;

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.9fr)]">
      <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:p-4" aria-labelledby="third-time-status-mix">
        <div className="flex flex-col gap-1">
          <h2 id="third-time-status-mix" className="text-base font-semibold">
            Estado por mes
          </h2>
          <p className="text-sm text-muted-foreground">Cada barra es el porcentaje de cuotas de ese mes.</p>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Estados del gráfico">
          {report.statusMix[0].shares.map((share) => (
            <li key={share.status} className="flex items-center gap-2 text-xs font-medium">
              <span aria-hidden="true" className={cn("size-2.5 rounded-sm", barClass[share.status])} />
              {thirdTimeStatusLabels[share.status]}
            </li>
          ))}
        </ul>
        <div className="grid min-w-0 grid-cols-6 gap-1 sm:grid-cols-12">
          {report.months.map((label, index) => {
            const mix = report.statusMix[index];
            return (
              <div
                key={label.abbreviation}
                role="img"
                aria-label={monthSummary(label.fullName, mix)}
                className={cn(
                  "group relative flex min-w-0 flex-col items-center gap-2 rounded-lg px-0.5 py-2 transition duration-200 ease-out",
                  "motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md",
                  "motion-reduce:transition-none",
                )}
              >
                <MonthTooltip mix={mix} monthName={label.fullName} />
                <StatusBar mix={mix} />
                <span className="text-xs font-medium">{label.abbreviation}</span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-background p-3 sm:p-4" aria-labelledby="third-time-collection">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="third-time-collection" className="text-base font-semibold">
              Esperado y recaudado
            </h2>
            <p className="text-sm text-muted-foreground">
              {playersLabel}
              {categoryAmount ? ` · ${formatExpenseMoney(categoryAmount)} por jugadora` : ""}
            </p>
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium" htmlFor="third-time-report-month">
            Mes
            <Select
              items={monthItems}
              value={String(month)}
              onValueChange={(next: string | null) => {
                if (next) setMonth(Number(next));
              }}
            >
              <SelectTrigger id="third-time-report-month" className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        {comparison.expected === null ? (
          <p className="text-sm">Esta categoría no tiene un monto de 3er tiempo cargado.</p>
        ) : (
          <CollectionGap
            monthName={selectedMonth.fullName}
            expected={comparison.expected}
            collected={comparison.collected}
            difference={comparison.difference ?? "0.00"}
          />
        )}
        <p className="text-sm text-muted-foreground">Lo recaudado suma únicamente las cuotas pagadas de ese mes.</p>
      </section>
    </div>
  );
}

function StatusBar({ mix }: { mix: ThirdTimeMonthStatusMix }) {
  const frame = "h-28 w-full origin-bottom rounded-md transition-transform duration-200 ease-out motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105 motion-reduce:transition-none sm:h-40";

  if (mix.total === 0) {
    return (
      <span aria-hidden="true" className={cn(frame, "flex items-center justify-center border border-dashed border-border bg-muted/70 text-[10px] font-semibold text-muted-foreground")}>
        0%
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={cn(frame, "flex flex-col-reverse gap-px overflow-hidden bg-background ring-1 ring-border")}>
      {mix.shares
        .filter((share) => share.count > 0)
        .map((share) => (
          <span
            key={share.status}
            className={cn("flex items-center justify-center px-0.5 text-[10px] leading-none font-semibold tabular-nums", barClass[share.status])}
            style={{ flexGrow: share.count, flexBasis: "0.875rem" }}
          >
            {share.percent}%
          </span>
        ))}
    </span>
  );
}

function MonthTooltip({ mix, monthName }: { mix: ThirdTimeMonthStatusMix; monthName: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-max max-w-[11rem] -translate-x-1/2 flex-col gap-0.5 rounded-md bg-popover px-2 py-1.5 text-left text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10",
        "opacity-0 transition duration-200 ease-out",
        "group-hover:opacity-100 group-focus-visible:opacity-100",
        "motion-safe:translate-y-1 motion-safe:group-hover:translate-y-0 motion-safe:group-focus-visible:translate-y-0",
        "motion-reduce:transition-none sm:flex",
      )}
    >
      <span className="font-medium">{monthName}</span>
      {mix.total === 0 ? (
        <span>Sin cuotas</span>
      ) : (
        mix.shares.map((share) => (
          <span key={share.status}>
            {thirdTimeStatusLabels[share.status]} {share.percent}%
          </span>
        ))
      )}
    </span>
  );
}

function CollectionGap({
  monthName,
  expected,
  collected,
  difference,
}: {
  monthName: string;
  expected: string;
  collected: string;
  difference: string;
}) {
  const scale = Math.max(Number(expected), Number(collected), 0);
  const gap = gapCopy(difference);

  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-col gap-1">
        <span className={cn("text-sm font-medium", gap.tone)}>{gap.label}</span>
        <span className="text-2xl font-semibold tracking-tight break-words tabular-nums sm:text-3xl">{formatExpenseMoney(unsigned(difference))}</span>
        <span className="sr-only">en {monthName}</span>
      </p>
      <div className="flex flex-col gap-3">
        <AmountBar label="Esperado" amount={expected} scale={scale} className="bg-primary" />
        <AmountBar label="Recaudado" amount={collected} scale={scale} className="bg-status-active-foreground" />
      </div>
    </div>
  );
}

function AmountBar({
  label,
  amount,
  scale,
  className,
}: {
  label: string;
  amount: string;
  scale: number;
  className: string;
}) {
  const width = scale <= 0 ? 0 : Math.min(100, (Number(amount) / scale) * 100);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="min-w-0 text-right break-words tabular-nums">{formatExpenseMoney(amount)}</span>
      </span>
      <span className="h-2 overflow-hidden rounded-full bg-muted">
        <span aria-hidden="true" className={cn("block h-full rounded-full", className)} style={{ width: `${width}%` }} />
      </span>
    </div>
  );
}

function monthSummary(monthName: string, mix: ThirdTimeMonthStatusMix): string {
  if (mix.total === 0) return `${monthName}: sin cuotas.`;
  const shares = mix.shares.map((share) => `${thirdTimeStatusLabels[share.status]} ${share.percent}%`).join(", ");
  return `${monthName}: ${shares}.`;
}

function gapCopy(difference: string): { label: string; tone: string } {
  if (difference.startsWith("-")) return { label: "Falta", tone: "text-status-temporary-foreground" };
  if (difference === "0.00") return { label: "En línea", tone: "text-muted-foreground" };
  return { label: "A favor", tone: "text-status-active-foreground" };
}

function unsigned(amount: string): string {
  return amount.startsWith("-") ? amount.slice(1) : amount;
}
