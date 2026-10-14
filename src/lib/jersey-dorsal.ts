/** Light theme: JPG with white backdrop (multiply in UI). */
export const jerseyDorsalLightSrc = "/brand/jersey-dorsal.jpg";

/** Dark theme: PNG tuned for dark surfaces. */
export const jerseyDorsalDarkSrc = "/brand/jersey-dorsal-dark.png";

export const jerseyDorsalLightSize = { width: 928, height: 836 } as const;
export const jerseyDorsalDarkSize = { width: 1648, height: 1456 } as const;

/** @deprecated Use jerseyDorsalLightSrc / jerseyDorsalDarkSrc */
export const jerseyDorsalSrc = jerseyDorsalLightSrc;

/** Display digits for overlay on the dorsal graphic (1–999). */
export function formatJerseyDorsalNumber(jerseyNumber: number): string {
  return String(jerseyNumber);
}
