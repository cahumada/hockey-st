import type { ReactNode } from "react";
import type { RosterInactiveReason, RosterStatus } from "@/lib/roster";
import { cn } from "cn";

export const statusTones = ["active", "inactive", "temporary", "injury", "permanent"] as const;

export type StatusTone = (typeof statusTones)[number];

const toneClass: Record<StatusTone, string> = {
  active: "bg-status-active text-status-active-foreground",
  inactive: "bg-status-inactive text-status-inactive-foreground",
  temporary: "bg-status-temporary text-status-temporary-foreground",
  injury: "bg-status-injury text-status-injury-foreground",
  permanent: "bg-status-permanent text-status-permanent-foreground",
};

const toneMarkClass: Record<StatusTone, string> = {
  active: "bg-chart-2",
  inactive: "bg-chart-1",
  temporary: "bg-chart-5",
  injury: "bg-chart-3",
  permanent: "bg-chart-4",
};

export function statusMarkClass(tone: StatusTone): string {
  return toneMarkClass[tone];
}

export function rosterStatusTone(
  status: RosterStatus,
  reason: RosterInactiveReason | null,
): StatusTone {
  if (status !== "INACTIVE") {
    return "active";
  }

  if (reason === "TEMPORARY") {
    return "temporary";
  }

  if (reason === "INJURY") {
    return "injury";
  }

  if (reason === "PERMANENT") {
    return "permanent";
  }

  return "inactive";
}

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full items-center rounded-full px-2 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
