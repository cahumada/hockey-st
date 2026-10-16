"use client";

import { Info } from "lucide-react";
import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatExpenseMoney } from "@/lib/expenses";
import { defaultPlayerAvatarSrc } from "@/lib/player-portrait";
import { thirdTimeStatusLabels } from "@/lib/third-time";
import {
  adjustThirdTimeReportColumnWidth,
  defaultThirdTimeReportColumnWidths,
  thirdTimeReportColumnMinimum,
  thirdTimeReportFittedWidths,
  type ThirdTimeCategoryReport,
  type ThirdTimeReportCell,
} from "@/lib/third-time-report";
import { cn } from "cn";

const statusLabel = {
  ...thirdTimeStatusLabels,
  MIXED: "Mixto",
} as const;

const statusClass = {
  PAID: "bg-status-active text-status-active-foreground",
  PENDING: "bg-status-temporary text-status-temporary-foreground",
  EXEMPT: "bg-status-inactive text-status-inactive-foreground",
  MIXED: "bg-muted text-foreground",
} as const;

const nudgeStep = 8;
const stickyPlayer = "sticky left-0 z-10 border-r border-border bg-card";

export function ThirdTimeCategoryReport({
  categoryLabel,
  report,
}: {
  categoryLabel: string;
  report: ThirdTimeCategoryReport;
}) {
  const [widths, setWidths] = useState(defaultThirdTimeReportColumnWidths);
  const drag = useRef<{ index: number; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useLayoutEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const fit = () => {
      if (!media.matches) return;
      const table = tableRef.current;
      const sample = table?.querySelector("th");
      if (!table || !(sample instanceof HTMLElement)) return;
      const style = getComputedStyle(sample);
      const measure = (text: string, weight: string) => {
        const context = document.createElement("canvas").getContext("2d");
        if (!context) return text.length * 8;
        context.font = `${weight} ${style.fontSize} ${style.fontFamily}`;
        return context.measureText(text).width;
      };
      setWidths(
        thirdTimeReportFittedWidths({
          headerWidth: Math.max(measure("Jugadora", "500"), measure("Total", "600")),
          nameWidths: report.rows.map((row) => measure(row.displayName, "600")),
          monthWidths: report.months.map((_, index) =>
            Math.max(
              measure(report.months[index].abbreviation, "500"),
              measure(formatExpenseMoney(report.columnTotals[index]), "600"),
              ...report.rows.map((row) => measure(cellText(row.cells[index]), "500")),
            ),
          ),
          totalHeaderWidth: measure("Total", "500"),
          totalWidths: [
            ...report.rows.map((row) => measure(formatExpenseMoney(row.total), "500")),
            measure(formatExpenseMoney(report.grandTotal), "600"),
          ],
        }),
      );
    };
    fit();
    media.addEventListener("change", fit);
    return () => media.removeEventListener("change", fit);
  }, [report]);
  const labels = ["Jugadora", ...report.months.map((month) => month.fullName), "Total"];
  const tableWidth = widths.reduce((sum, width) => sum + width, 0);

  function resize(index: number, startWidth: number, delta: number) {
    setWidths((current) => {
      const next = current.slice();
      next[index] = adjustThirdTimeReportColumnWidth(startWidth, delta, thirdTimeReportColumnMinimum(index));
      return next;
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ul className="flex flex-wrap gap-2" aria-label="Estados">
        {(Object.keys(statusClass) as (keyof typeof statusClass)[]).map((status) => (
          <li
            key={status}
            title={status === "MIXED" ? "La jugadora tiene más de una cuota en ese mes y no comparten el estado." : undefined}
            className={cn("rounded-md px-2 py-1 text-xs font-medium", statusClass[status])}
          >
            {statusLabel[status]}
          </li>
        ))}
      </ul>
      <Alert role="status" className="hidden md:grid">
        <Info aria-hidden="true" />
        <AlertDescription>
          <p>Arrastrá el borde de una columna para cambiar su ancho.</p>
        </AlertDescription>
      </Alert>
      <MobilePlayerList report={report} />
      <div className="hidden min-w-0 overflow-x-auto md:block">
        <table
          ref={tableRef}
          className="border-separate border-spacing-0 text-sm"
          style={{ tableLayout: "fixed", width: tableWidth }}
        >
          <caption className="sr-only">
            Informe de {categoryLabel} en {report.year}
          </caption>
          <colgroup>
            {widths.map((width, index) => (
              <col key={labels[index]} style={{ width }} />
            ))}
          </colgroup>
          <thead>
            <tr className="text-left text-muted-foreground">
              {labels.map((label, index) => (
                <th
                  key={label}
                  title={index > 0 && index < labels.length - 1 ? label : undefined}
                  className={cn(
                    "relative border-b px-2 py-2 font-medium",
                    index === 0 ? cn("px-3 text-left", stickyPlayer) : "text-right",
                  )}
                >
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                    {index === 0 ? label : index === labels.length - 1 ? label : report.months[index - 1].abbreviation}
                  </span>
                  <ColumnWidthHandle
                    label={label}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.currentTarget.focus();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      drag.current = { index, startX: event.clientX, startWidth: widths[index] };
                    }}
                    onPointerMove={(event) => {
                      const active = drag.current;
                      if (!active || active.index !== index || !event.currentTarget.hasPointerCapture(event.pointerId)) {
                        return;
                      }
                      resize(index, active.startWidth, event.clientX - active.startX);
                    }}
                    onPointerUp={() => {
                      drag.current = null;
                    }}
                    onNudge={(delta) => resize(index, widths[index], delta)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.playerId}>
                <th scope="row" title={row.displayName} className={cn("border-b px-3 py-2 text-left font-semibold", stickyPlayer)}>
                  <span className="flex min-w-0 items-center gap-2">
                    <PlayerThumb src={row.portraitSrc} />
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{row.displayName}</span>
                  </span>
                </th>
                {row.cells.map((cell, index) => (
                  <td
                    key={report.months[index].abbreviation}
                    title={cellTitle(cell)}
                    className={cn(
                      "border-b px-2 py-2 text-right tabular-nums",
                      cellClass(cell),
                    )}
                  >
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                      <CellValue cell={cell} />
                    </span>
                  </td>
                ))}
                <td
                  title={formatExpenseMoney(row.total)}
                  className="border-b px-3 py-2 text-right font-medium tabular-nums"
                >
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                    {formatExpenseMoney(row.total)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className={cn("px-3 py-3 text-left font-semibold", stickyPlayer)}>
                Total
              </th>
              {report.columnTotals.map((total, index) => (
                <td
                  key={report.months[index].abbreviation}
                  title={formatExpenseMoney(total)}
                  className="px-2 py-3 text-right font-medium tabular-nums"
                >
                  <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                    {formatExpenseMoney(total)}
                  </span>
                </td>
              ))}
              <td
                title={formatExpenseMoney(report.grandTotal)}
                className="px-3 py-3 text-right font-semibold tabular-nums"
              >
                <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                  {formatExpenseMoney(report.grandTotal)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function MobilePlayerList({ report }: { report: ThirdTimeCategoryReport }) {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      <ul className="flex flex-col gap-3">
        {report.rows.map((row) => (
          <li key={row.playerId} className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <PlayerThumb src={row.portraitSrc} />
              <h3 className="min-w-0 flex-1 text-base font-semibold">{row.displayName}</h3>
            </div>
            <p className="mt-3 flex items-baseline justify-between gap-3 border-b border-border pb-3 text-sm">
              <span className="font-medium">Total</span>
              <span className="text-base font-semibold tabular-nums">{formatExpenseMoney(row.total)}</span>
            </p>
            <ol className="mt-3 grid grid-cols-2 gap-2">
              {row.cells.map((cell, index) => (
                <li
                  key={report.months[index].abbreviation}
                  title={cellTitle(cell)}
                  className={cn(
                    "flex min-w-0 flex-col gap-1 rounded-md px-2.5 py-2",
                    cell.status === "EMPTY" ? "border border-border bg-muted/40" : cellClass(cell),
                  )}
                >
                  <span className="text-xs font-medium">{report.months[index].fullName}</span>
                  <span className="text-sm font-semibold break-words tabular-nums">
                    <CellValue cell={cell} />
                  </span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
      <section className="rounded-lg border border-border bg-background p-3" aria-labelledby="third-time-mobile-total">
        <h3 id="third-time-mobile-total" className="text-base font-semibold">
          Total
        </h3>
        <p className="mt-3 flex items-baseline justify-between gap-3 border-b border-border pb-3 text-sm">
          <span className="font-medium">Año</span>
          <span className="text-base font-semibold tabular-nums">{formatExpenseMoney(report.grandTotal)}</span>
        </p>
        <ol className="mt-3 grid grid-cols-2 gap-2">
          {report.columnTotals.map((total, index) => (
            <li key={report.months[index].abbreviation} className="flex min-w-0 flex-col gap-1 rounded-md border border-border px-2.5 py-2">
              <span className="text-xs font-medium text-muted-foreground">{report.months[index].fullName}</span>
              <span className="text-sm font-semibold break-words tabular-nums">{formatExpenseMoney(total)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function PlayerThumb({ src }: { src: string }) {
  return (
    // The private avatar route needs the session cookie, which next/image does not send.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || defaultPlayerAvatarSrc}
      alt=""
      width={32}
      height={32}
      referrerPolicy="no-referrer"
      className="size-8 shrink-0 rounded-full object-cover"
    />
  );
}

function cellText(cell: ThirdTimeReportCell): string {
  if (cell.status === "EMPTY") return "—";
  return cell.amount === null ? "Sin importe" : formatExpenseMoney(cell.amount);
}

function ColumnWidthHandle({
  label,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onNudge,
}: {
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onNudge: (delta: number) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Ajustar ancho de ${label}`}
      title="Arrastrá para ajustar el ancho. Con el teclado, usá las flechas."
      className="group absolute inset-y-0 -right-1.5 z-10 w-3 cursor-col-resize touch-none bg-transparent p-0"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          onNudge(nudgeStep);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          onNudge(-nudgeStep);
        }
      }}
    >
      <span className="pointer-events-none absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-border group-hover:w-0.5 group-hover:bg-foreground group-focus-visible:w-0.5 group-focus-visible:bg-foreground" />
    </button>
  );
}

function cellClass(cell: ThirdTimeReportCell): string | undefined {
  if (cell.status === "EMPTY") return undefined;
  return statusClass[cell.status];
}

function cellTitle(cell: ThirdTimeReportCell): string {
  if (cell.status === "EMPTY") return "—";
  const amount = cell.amount === null ? "Sin importe" : formatExpenseMoney(cell.amount);
  return `${statusLabel[cell.status]}. ${amount}`;
}

function CellValue({ cell }: { cell: ThirdTimeReportCell }) {
  if (cell.status === "EMPTY") return "—";
  return (
    <>
      <span className="sr-only">{statusLabel[cell.status]}. </span>
      {cell.amount === null ? "Sin importe" : formatExpenseMoney(cell.amount)}
    </>
  );
}
