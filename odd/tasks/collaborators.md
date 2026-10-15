# Collaborators

## Objective

Show the 2026 `Colaboradores` sheet in the app. A collaborator is a club person who can be linked to an application user. An administrator assigns that user's role. An administrator or a coordinator sets the collaborator's kind and category.

## Problem

The club tracks collaborators on `docs/legacy/2026-Hockey San Telmo.xlsx`, sheet `Colaboradores`. The app has roles and player categories, but no collaborator directory, no kind, and no way to attach a signed-in account to one of those people.

## Why

Fees and third-time work need a stable collaborator identity. The sheet has no email, so Google sign-in cannot create these people. The directory comes from the sheet; the account link happens later.

## Scope

- Import the 10 sheet rows: legacy id, display name, kind, optional category, status, optional status date.
- `Collaborator` with an optional one-to-one `userId`.
- Capability `manage-collaborators` for administrator and coordinator.
- Page `/collaborators` listing the sheet.
- Administrator and coordinator edit kind and category.
- Administrator links an existing user and assigns `User.role`.
- Seed that inserts missing rows and does not overwrite later edits.

## Non-goals

- Creating Google accounts or inventing emails.
- Editing status on this screen. Status is shown from the sheet.
- Income, expense, sponsor payments, or the `3er Tiempo` finance sheet.
- Replacing the `/roles` placeholder with a general user directory.
- Splitting display names.

## Decision

`displayName` stores column Descripción exactly. Kind is the sheet column Tipo, not `User.role`. Category is optional and, when set, is a `Category.code` from the player catalog. `Coordinador` as a kind does not assign the `COORDINATOR` role.

Kind values: `COORDINATOR` (Coordinador), `THIRD_TIME` (3er Tiempo), `SPONSOR` (Sponsor), `SPECIAL_CASH` (Caja especial).

Status: `Activo` → `ACTIVE`, `Inactivo` → `INACTIVE`. Dates: Rosana Lavagnino `2026-09-01`, Pablo Bellemans `2026-06-01`.

Rows:

| legacyId | displayName | kind | category | status | status date |
| --- | --- | --- | --- | --- | --- |
| 1 | Anabella | COORDINATOR | | ACTIVE | |
| 2 | Natalia Palladino | THIRD_TIME | 9na | ACTIVE | |
| 3 | Gaby Agos | THIRD_TIME | 8va | ACTIVE | |
| 4 | Rosana Lavagnino | THIRD_TIME | 7ma | INACTIVE | 2026-09-01 |
| 5 | Norma Rivero | THIRD_TIME | 7ma | ACTIVE | |
| 6 | Elena Molina | THIRD_TIME | 5ta | ACTIVE | |
| 7 | Clarisa | THIRD_TIME | PS | ACTIVE | |
| 8 | Fernanda Largosta | THIRD_TIME | 6ta | ACTIVE | |
| 9 | Pablo Bellemans | SPONSOR | | INACTIVE | 2026-06-01 |
| 10 | Malena | SPECIAL_CASH | | ACTIVE | |

Unlinking a user clears `Collaborator.userId` and leaves `User.role` unchanged.

## Tasks

- [x] C1 Validate the Colaboradores sheet as a typed dataset.
- [x] C2 Add `Collaborator` in Prisma, migrate, and seed.
- [x] C3 Allow administrator and coordinator to manage collaborators.
- [x] C4 Show the collaborator directory.
- [x] C5 Edit kind and category, and let an administrator link a user and role.
- [x] C6 Add a collaborator from the directory. The next legacy id is assigned on save. The new person starts without a linked account.

## Acceptance

- The dataset has 10 collaborators, legacy ids 1 through 10, and the rows in the decision table.
- Category codes that are set exist in the category catalog. Empty category stays null.
- Administrator and coordinator can open `/collaborators`. Other roles cannot.
- Only an administrator can link a user or change `User.role`.
- A user can be linked to at most one collaborator.
- `pnpm test` passes.
- Visible copy is Spanish. Identifiers stay English.

## Progress

C1–C6 are in the delivery commit on `feat/collaborators`. The directory lists the sheet, filters by status, kind, and category, and an administrator or coordinator can add a person. The next legacy id is assigned on save. The new person starts without a linked account.

## Verification

- `pnpm test`: exit 0, 60 passed, 0 failed. Includes the legacy sheet rows, the assignment and profile parsers, browse filters, and the next legacy id.
- `pnpm exec tsc --noEmit`: exit 0.
- `pnpm exec prisma validate`: exit 0.
- `pnpm exec prisma migrate deploy`: exit 0, no pending migrations. `20261014181500_collaborators` is already applied.
- `pnpm db:seed`: exit 0. Reseed uses `update: {}`, so later kind, category, status, and account edits stay.
- Database read-back: 10 collaborators, legacy ids 1–10, matching the decision table. Rosana Lavagnino is inactive on 2026-09-01. Pablo Bellemans is inactive on 2026-06-01. None are linked to a user yet.
- Gentle AI verify subagent failed to start. These checks ran in the parent session.
- The signed-in `/collaborators` screen was not opened in a browser. There is no browser tool in this session, and the page requires an administrator or coordinator session.

## Next step

Open `/collaborators` as administrator and confirm the directory, the filters, the create form, and the account link.
