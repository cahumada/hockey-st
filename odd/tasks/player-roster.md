# Player roster

## Objective

Load the 2026 jugadoras master list from `docs/legacy/2026-Hockey San Telmo.xlsx` into the domain model.

## Problem

The club keeps the player list on the `Jugadoras` sheet. `Player` only has `givenName` and `familyName`, so the sheet cannot be stored without guessing a name split the file does not support.

## Why

Later fee and parent-portal work needs a stable player identity, category, and active/inactive status taken from the sheet the club already uses.

## Scope

- Sheet `Jugadoras`: legacy id, display name, category code, status, optional reason, optional status date.
- Sheet `Categorias`: the category catalog those codes belong to, including categories with no players yet.
- A checked-in roster dataset, a validator, a Prisma migration, and a seed.

## Non-goals

- Income, expense, cash, and fee rows.
- The `Colaboradores` sheet.
- Splitting `Nombre y Apellido` into given and family names.
- Creating user accounts or parent links.
- A roster screen.

## Decision

`displayName` stores column B exactly. The sheet mixes nicknames, `Apellido Nombres`, and both comma orders, so a split would invent names. `givenName` and `familyName` stay optional for a future account link and are left empty by this load.

`Activa` maps to `ACTIVE`. `Baja` maps to `INACTIVE`. Excel serial dates in `Fecha` become calendar dates. `Motivo` is stored only when the cell has text.

## Tasks

- [x] R1 Validate the Jugadoras sheet as a typed roster.
- [x] R2 Extend `Player` and add `Category` in Prisma.
- [x] R3 Seed categories and the 91 players.
- [x] R4 Check tests and whether the migration can apply.

## Acceptance

- The dataset has 91 players, legacy ids 1 through 91, and no blank names.
- Category codes are only `PS`, `5ta`, `6ta`, `7ma`, `8va`, `9na`, `10ma`, and `Esc`.
- Legacy id 60, `Gonzalez, Isabella`, is the only inactive player in this extract.
- Finance tables stay absent.
- `pnpm test` passes.

## Progress

R1–R4 are done. The sheet name stays in `displayName`. `givenName` and `familyName` are optional and empty. Categories `10ma` and `Esc` are in the catalog with no players. No commit: the user did not ask for one.

## Verification

- RED: `pnpm test` failed with `ERR_MODULE_NOT_FOUND` for `src/lib/legacy-roster.ts` before that module existed.
- GREEN: `pnpm test` exit 0, 10 tests.
- `pnpm exec prisma validate` exit 0. `pnpm exec prisma generate` exit 0.
- `pnpm exec prisma migrate deploy` applied `20261013133000_player_roster`. The init migration was already applied.
- `pnpm exec prisma db seed` exit 0.
- Database read-back: 8 categories, 91 players, 1 inactive. Legacy id 60 is `Gonzalez, Isabella`, `7ma`, `INACTIVE`, `2026-09-01`. Counts: PS 26, 5ta 10, 6ta 15, 7ma 17, 8va 9, 9na 14.
- Not run: `pnpm build`. No screen changed.
- Not run: a work-unit commit.

## Next step

Income, expense, and collaborator sheets are still outside this load. Commit when asked.
