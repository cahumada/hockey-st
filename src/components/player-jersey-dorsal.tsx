"use client";

import {
  formatJerseyDorsalNumber,
  jerseyDorsalDarkSize,
  jerseyDorsalDarkSrc,
  jerseyDorsalLightSize,
  jerseyDorsalLightSrc,
} from "@/lib/jersey-dorsal";
import { cn } from "cn";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

/**
 * Renders the club dorsal artwork with the player number centered on the striped back.
 * Tune overlay insets if the source asset changes.
 */
export function PlayerJerseyDorsal({
  jerseyNumber,
  className,
  backdropClassName = "bg-card",
  compact = false,
  avatar = false,
  framed = false,
}: {
  jerseyNumber: number;
  className?: string;
  /** Matches the surface behind the dorsal (for multiply backdrop). */
  backdropClassName?: string;
  /** Smaller number overlay for roster cards. */
  compact?: boolean;
  /** Circular presentation matching player portrait avatars. */
  avatar?: boolean;
  /** Border and padding so the dorsal reads as a thumbnail on cards. */
  framed?: boolean;
}) {
  const label = formatJerseyDorsalNumber(jerseyNumber);
  const numberOverlayStyle = avatar
    ? { left: "14%", right: "14%", top: "32%", bottom: "26%" }
    : { left: "22%", right: "22%", top: "38%", bottom: "38%" };

  const { resolvedTheme } = useTheme();
  const previousThemeRef = useRef<string | undefined>(undefined);
  const [themeFlipActive, setThemeFlipActive] = useState(false);

  useEffect(() => {
    if (!avatar || !resolvedTheme) {
      previousThemeRef.current = resolvedTheme;
      return;
    }

    const previous = previousThemeRef.current;
    previousThemeRef.current = resolvedTheme;

    if (previous === undefined || previous === resolvedTheme) {
      return;
    }

    setThemeFlipActive(true);
    const timer = window.setTimeout(() => setThemeFlipActive(false), 560);
    return () => window.clearTimeout(timer);
  }, [avatar, resolvedTheme]);

  const avatarImgClass =
    "max-h-full max-w-full object-contain object-center [backface-visibility:hidden] [image-rendering:-webkit-optimize-contrast] [transform:translateZ(0)_scale(1.11)]";
  const defaultImgClass = "mx-auto h-full w-auto max-w-none object-contain";

  const numberSizeClass = cn(
    compact &&
      avatar &&
      label.length >= 3 &&
      "text-sm sm:text-base",
    compact && avatar && label.length === 2 && "text-base sm:text-lg",
    compact && avatar && label.length === 1 && "text-lg sm:text-xl",
    compact &&
      !avatar &&
      label.length >= 3 &&
      "text-[0.5rem]",
    compact && !avatar && label.length === 2 && "text-[0.55rem]",
    compact && !avatar && label.length === 1 && "text-[0.62rem]",
    !compact && label.length >= 3 && "text-[0.55rem] sm:text-[0.6rem]",
    !compact && label.length === 2 && "text-[0.65rem] sm:text-xs",
    !compact && label.length === 1 && "text-xs sm:text-sm",
  );

  return (
    <div
      className={cn(
        "relative isolate inline-flex select-none flex-col",
        avatar &&
          "aspect-square items-center justify-center overflow-hidden rounded-full shadow-sm ring-2 ring-primary/20 ring-offset-2 ring-offset-card perspective-[1000px] [transform-style:preserve-3d]",
        avatar &&
          themeFlipActive &&
          "animate-[jersey-avatar-flip_0.55s_ease-in-out]",
        framed &&
          !avatar &&
          "overflow-hidden rounded-xl border border-border/60 bg-muted/35 p-0.5 shadow-sm ring-1 ring-border/30",
        className,
      )}
      aria-label={`Camiseta ${label}`}
    >
      <div
        className={cn("absolute inset-0 dark:hidden", backdropClassName)}
        aria-hidden="true"
      />
      <div className="absolute inset-0 hidden bg-card dark:block" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={jerseyDorsalLightSrc}
        alt=""
        width={jerseyDorsalLightSize.width}
        height={jerseyDorsalLightSize.height}
        decoding="async"
        draggable={false}
        className={cn(
          "relative block dark:hidden mix-blend-multiply",
          avatar ? avatarImgClass : defaultImgClass,
        )}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={jerseyDorsalDarkSrc}
        alt=""
        width={jerseyDorsalDarkSize.width}
        height={jerseyDorsalDarkSize.height}
        decoding="async"
        draggable={false}
        className={cn("relative hidden dark:block", avatar ? avatarImgClass : defaultImgClass)}
      />
      <div
        className="pointer-events-none absolute flex items-center justify-center"
        style={numberOverlayStyle}
      >
        <span
          className={cn(
            "max-w-full truncate text-center font-extrabold tabular-nums leading-none tracking-tight antialiased",
            "text-white dark:text-black",
            "[text-shadow:0_1px_2px_rgba(0,0,0,0.38)] dark:[text-shadow:0_1px_2px_rgba(255,255,255,0.45)]",
            numberSizeClass,
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
