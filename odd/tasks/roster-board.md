# Roster board

## Objective

Make the jugadoras listing a scannable, mobile-first roster. Search, status, and category filters come first. Photos and names lead each card. Profile edit, leave, and photo upload stay one action away.

## Problem

`/players` renders every category, including empty ones, as a vertical stack of forms. With about 90 players, the photo, the status, and the edit controls compete. There is no search.

## Why

Coordinators need to find a player and see the plantel. Editing is secondary.

## Scope

- Pure browse function: text, status, and category filters, with counts.
- Client roster board: sticky toolbar, summary, responsive grid, one expanded card.
- Quieter player card: portrait, status badge, compact photo change, existing edit and leave forms inside the expanded card.
- Spanish UI copy, San Telmo navy and celeste, light and dark.
- Loading skeleton instead of a plain text fallback.

## Non-goals

- New roster fields, roles, or upload rules.
- Account page and the navbar Google menu.
- Commits, push, or pull requests.

## Constraints

- Authorization stays on the server. Browse filters run on data the page already loaded.
- Keep the private avatar `<img>` and the existing server actions.
- Technical artifacts stay in English. UI copy stays Spanish.
- Touch targets stay at least 44px. Honor `prefers-reduced-motion`.
- Do not commit.

## Tasks

- [x] B1 Add roster browse filters with tests.
- [x] B2 Render the scannable roster board.
- [x] B3 Restyle player cards so actions stay secondary.

## Acceptance

- Search ignores case and accents and matches display name, given name, family name, and legacy id.
- Status and category filters compose with search. Empty categories stay hidden unless they are the active filter and have no matches.
- The default view is a portrait grid. At most one card is expanded.
- Photo upload appears after a file is chosen. Edit and leave stay inside that expanded card.
- `npm test` passes, including the browse tests.

## Progress

B1–B3 done. No commit.

## Verification

B1 RED: `npm test` exit 1, `ERR_MODULE_NOT_FOUND` for `src/lib/roster-browse.ts`, 26 pass, 1 fail.
B1 GREEN: `npm test` exit 0, 31 pass, 0 fail.
B2–B3: `npx eslint` on the roster files exit 0. `npx tsc --noEmit` exit 0. The dev server on port 3005 compiles the page. Anonymous `/players` still redirects to `/sign-in`, so the signed-in grid, search, and expand flow were not clicked through in a browser.

## Next step

Signed-in check of search, category chips, and one expanded card. Commit only if asked.
