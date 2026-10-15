# Sign-in crest

## Objective

Serve the transparent San Telmo hockey crest from `docs/Escudo.png` in the shell, and rebuild `/sign-in` around that mark.

## Problem

The shell still shows the opaque JPEG crest. Sign-in is a plain card with no club mark, so the first screen does not look like the rest of the app.

## Scope

- Publish a resized transparent PNG at `public/brand/san-telmo-crest.png`.
- Point the shell crest at that file.
- Rebuild `/sign-in`: crest, one Google action, theme toggle, light and dark.

## Non-goals

- Home page redesign.
- Avatar upload, roster board, or auth behavior.
- A commit, unless the user asks.

## Tasks

- [x] C1 Publish the transparent crest and point the shell at it.
- [x] C2 Rebuild the sign-in page around the crest.

## Progress

C1: `public/brand/san-telmo-crest.png` (534×640, transparent corners) from `docs/Escudo.png`. Shell uses PNG via `src/components/club-frame.tsx`.

C2: `/sign-in` uses club backdrop, glass card, crest hero, theme toggle, and Google CTA. Build and tests green on 2026-10-14.

## Acceptance

- The shell mark is the transparent PNG, not the JPEG.
- `/sign-in` shows the crest, the club name, and “Ingresar con Google”.
- A signed-in session still redirects to the dashboard.
- Light and dark both keep the crest on the page background.
