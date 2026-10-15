# Maintenance catalogs

## Objective

Add a Maintenance menu module with two catalogs, Tipos de gasto and Tipos de ingreso, for administrator and coordinator. Seed both catalogs from the 2026 workbook and manage them with the collaborator-list UX.

## Problem

Income and expense types live only on `docs/legacy/2026-Hockey San Telmo.xlsx` (`Tipo Gastos`, `Tipo Ingresos`). The sidebar is a flat list and has no maintenance module.

## Why

Movements need stable type catalogs. The sheets are the source. Only administrator and coordinator maintain them.

## Scope

- Capability `manage-maintenance` for `ADMINISTRATOR` and `COORDINATOR` only. Other roles are denied.
- Sidebar group **Mantenimiento** with two child links, each with an icon:
  - Tipos de gasto → `/maintenance/expense-types`
  - Tipos de ingreso → `/maintenance/income-types`
- Models `ExpenseType` and `IncomeType`: `legacyId`, `description`, `status` (`ACTIVE` | `INACTIVE`).
- Seed the sheet rows. Insert missing `legacyId`s and do not overwrite later edits.
- Each page lists, searches, filters by status, and creates or edits description and status in a modal. Mobile cards, desktop table, status stripe and badge. Same visual language as collaborators.
- New legacy ids are `max(legacyId) + 1`. No delete.

## Non-goals

- Recording income or expense movements.
- Linking a type to a movement, collaborator, or category.
- A parent route at `/maintenance`.
- Overwriting descriptions or status that staff already edited.

## Sheet rows

Tipo Gastos, all `ACTIVE`:

1 Cancha Chicago, 2 Micros 3er T, 3 Árbitro 1, 4 Árbitro 2, 5 Médico, 6 Bananas, 7 Alfajores, 8 Aguas, 9 Panchos, 10 Aderezos, 11 Ensaladas, 12 Botiquín, 13 Sede, 14 Asociación, 15 Otros.

Tipo Ingresos, all `ACTIVE`:

1 Tercer Tiempo, 2 Sponsor, 3 Donaciones, 4 Otros.

## Tasks

- [x] M1 Grant `manage-maintenance` and show the Mantenimiento group to administrator and coordinator.
- [x] M2 Add both catalog models, the migration, and the non-destructive seed.
- [x] M3 Add both catalog pages with the collaborator-list UX.

## Acceptance

- Administrator and coordinator see Mantenimiento with both sub-items. Collaborator, player, parent, and visitor do not, and `requireAccess` returns not found for them.
- Seeded descriptions match the sheet, including accents.
- Create and edit change description and status. Seed does not clobber those edits.
- `npm test` passes. Focused tests cover access, navigation grouping, browse/parse, and the seed rows.

## Progress

Branch `feat/maintenance-catalogs`. M1, M2, and M3 are implemented. The package writer was unusable, so the tasks ran on the native writer fallback.

## Verification

M1: `npm test` RED was 60 pass / 1 fail (`club-navigation.ts` missing). GREEN was 63 pass / 0 fail. Commit `e031c56c9a37fe09ff7ce8f7bc38bf5113cd2123`. Sidebar was not opened in a browser because the catalog routes do not exist yet.

M2: `npm test` RED was 63 pass / 1 fail (catalog module missing). GREEN was 65 pass / 0 fail. `prisma validate` and `prisma generate` exited 0. Migration SQL was not applied. Commit `47e7dc2fc88a0dbacfa4747bf62d96e67f60e97a`.

M3: `npm test` RED was 65 pass / 1 fail (maintenance-catalog module missing). GREEN was 70 pass / 0 fail. `tsc --noEmit` exited 0. The catalog screens were not clicked in a browser.

## Next step

Apply `prisma/migrations/20261014223000_maintenance_catalogs` on the club database, then open Tipos de gasto and Tipos de ingreso as administrator or coordinator.
