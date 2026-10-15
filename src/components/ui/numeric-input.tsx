"use client";

import { useRef, useState, type InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";
import { formatNumericDisplay, formatNumericOnBlur, numericEditDraft, parseNumericDraft } from "@/lib/numeric-format";

export function NumericInput({
  value,
  onChange,
  onBlur,
  onFocus,
  symbol = "",
  symbolIcon: SymbolIcon,
  symbolPosition = "left",
  locale = "es-AR",
  minimumFractionDigits = 0,
  maximumFractionDigits = 0,
  min,
  max,
  className,
  ...props
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
  symbol?: string;
  symbolIcon?: LucideIcon;
  symbolPosition?: "left" | "right";
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  min?: number;
  max?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "min" | "max">) {
  const [text, setText] = useState(() =>
    value === undefined
      ? ""
      : formatNumericDisplay(value, locale, minimumFractionDigits, maximumFractionDigits),
  );
  const textRef = useRef(text);
  const showSymbol = symbol.length > 0;

  function show(next: string) {
    textRef.current = next;
    setText(next);
  }

  return (
    <span className="relative block">
      {showSymbol && symbolPosition === "left" ? (
        <SymbolAdornment icon={SymbolIcon} symbol={symbol} position="left" />
      ) : null}
      <input
        {...props}
        inputMode="decimal"
        autoComplete="off"
        value={text}
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-background text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          showSymbol && symbolPosition === "left" && "pr-3 pl-10",
          showSymbol && symbolPosition === "right" && "pr-10 pl-3",
          !showSymbol && "px-3",
          className,
        )}
        onFocus={(event) => {
          const parsed = parseNumericDraft(textRef.current);
          show(parsed === null ? textRef.current : numericEditDraft(parsed, maximumFractionDigits));
          onFocus?.(event);
        }}
        onBlur={(event) => {
          const formatted = formatNumericOnBlur(textRef.current, {
            locale,
            minimumFractionDigits,
            maximumFractionDigits,
            min,
            max,
          });
          show(formatted.text);
          onChange(formatted.value);
          onBlur?.(event);
        }}
        onChange={(event) => {
          const next = event.target.value;
          show(next);
          const formatted = formatNumericOnBlur(next, {
            locale,
            minimumFractionDigits,
            maximumFractionDigits,
            min,
            max,
          });
          if (formatted.value !== undefined || !next.trim()) onChange(formatted.value);
        }}
      />
      {showSymbol && symbolPosition === "right" ? (
        <SymbolAdornment icon={SymbolIcon} symbol={symbol} position="right" />
      ) : null}
    </span>
  );
}

function SymbolAdornment({
  icon: Icon,
  symbol,
  position,
}: {
  icon?: LucideIcon;
  symbol: string;
  position: "left" | "right";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center text-muted-foreground",
        position === "left" ? "left-3" : "right-3",
      )}
    >
      {Icon ? <Icon className="size-4" /> : <span className="text-sm">{symbol}</span>}
    </span>
  );
}
