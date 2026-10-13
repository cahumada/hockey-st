# Player screen

## Objective

Show the loaded roster grouped by category, and let club operators edit a player, record a leave, or reactivate them.

## Problem

The 91 players and 8 categories are in Postgres, and no route reads them.

## Why

The club still changes category, name, and active status on the spreadsheet. The screen is the first place those changes can land without guessing a name split.

## Scope

- Route `/players` for administrator and coordinator.
- Group players by category, including categories with nobody in them.
- Edit display name, given name, family name, and category.
- Deactivate with a temporary, injury, or permanent reason, and reactivate.

## Non-goals

- Creating players, user accounts, or parent links.
- Finance, fees, and collaborator sheets.
- Splitting an existing display name automatically.

## Decision

`statusReason` becomes `TEMPORARY`, `INJURY`, or `PERMANENT`. An inactive row loaded without a reason stays inactive until an operator chooses one. Reactivation clears the reason and records the club date in `America/Argentina/Buenos_Aires`. Collaborators do not get this capability.

## Tasks

- [x] S1 Encode profile edits and leave transitions.
- [x] S2 Store the leave reason as an enum and stop the seed from overwriting later edits.
- [x] S3 Add the players screen and the `manage-roster` capability.
- [x] S4 Check tests, migration, and the route shell.

## Progress

S1–S4 are done. `/players` is in the build as a partial prerender. No commit: the user did not ask for one.

## Verification

- RED: `node --experimental-strip-types --test src/lib/roster.test.ts` failed with `ERR_MODULE_NOT_FOUND` for `src/lib/roster.ts`.
- GREEN: `pnpm test` exit 0, 16 tests.
- `pnpm exec tsc --noEmit` exit 0. `pnpm build` exit 0. Route `/players` is present.
- `pnpm exec prisma migrate deploy` applied `20261013144500_roster_inactive_reason`.
- Database read: PS 26, 5ta 10, 6ta 15, 7ma 17 (1 inactive), 8va 9, 9na 14, 10ma 0, Esc 0.
- A temporary `INJURY` write for legacy id 60 was rolled back. `Gonzalez, Isabella` remains `INACTIVE` with no reason.
- `GET /players` without a session renders the account shell and redirects to `/sign-in`. Player names are not in that response.
- Not run: a signed-in browser pass. There is no local session, and Google sign-in was not exercised.
- Not run: a work-unit commit.

## Acceptance

- Players render under their category.
- A blank display name is rejected.
- Deactivation requires one of the three reasons.
- Reactivation is refused when the player is already active.
- Administrator and coordinator can open the route. Other roles cannot.
