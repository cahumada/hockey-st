# Third time ledger

## Objective

Add a `3er Tiempo` ledger that follows the 2026 workbook sheet `3er Tiempo`, reuses `Player`, `Category`, and `Collaborator`, and matches the Gastos ledger UX.

## Problem

Family third-time fees live only on `docs/legacy/2026-Hockey San Telmo.xlsx`, sheet `3er Tiempo` (header on row 2, 804 data rows, columns A–L). The app already has the roster and the collaborator directory, including kind `THIRD_TIME`, but no fee ledger.

## Why

Staff already track these fees next to Gastos. Every data row matches an existing player by display name and category, and every `Control` value matches a collaborator display name. The ledger should use those records instead of a second free-text list.

## Sheet contract

Header row: Nombre y Apellido, Categoria, Importe, Fecha, Fecha Pago, Comprobante, Canal, Estado, Control, Mes, Año, Obs.

- `Mes` and `Año` are formulas from `Fecha` (`CONCATENATE(TEXT(D,"MM")," - ", TEXT(D,"MMMM"))` and `TEXT(D,"YYYY")`). Do not store them. Period filters use `Fecha`.
- Excel dates are serials. Epoch is 1899-12-30. Serial `46054` is 2026-02-01. Serial `46082` is 2026-03-01.
- `Estado` is `Pagado`, `Pendiente`, or `Exento`.
- `Importe` is empty on 278 pendiente rows, 12 exento rows, and 2 pagado rows. One exento row has an amount. Store amount as nullable money. Do not invent a zero.
- `Fecha Pago` is empty when unpaid.
- `Comprobante` is usually empty. A numeric or text operation id is a reference, not a file. The cell text `link` means a Google Drive hyperlink on that cell (33 hyperlinks, almost all in column F). Store the Drive file id and, on import, copy the file to private Blob the same way Gastos does. One Drive file can be shared, so the file id is indexed and not unique.
- `Canal` is free text. Observed values: Otro, Mercado Pago, BBVA, Modo, Galicia, Efectivo, Anabella, Hipotecario, Santander. Do not make it an enum.
- `Control` is the collaborator display name (`Natalia Palladino`, `Gaby Agos`, `Rosana Lavagnino`, `Norma Rivero`, `Elena Molina`, `Clarisa`, `Fernanda Largosta`).
- Player labels match `legacyPlayerRows` display names, including comma forms such as `Fabiana, Bravo`. Match on display name plus category. The check against `src/lib/legacy-roster-data.ts` found 0 unmatched rows and 0 duplicate roster names.
- `Obs` is an optional note.

## Scope

- Branch `feat/third-time`.
- Model `ThirdTimeFee` related to `Player`, `Category`, and `Collaborator` (the controller).
- Pure parser and list/form helpers with tests.
- Menu label `3er Tiempo`, Lucide `Clock3`, icon key `third-time`, route `/third-time`, immediately after Gastos.
- Same capability as Gastos: `register-movements` (administrator, coordinator, collaborator).
- Mobile-first ledger: summary cards, search on the list, filters in a drawer, server pagination, empty state, create/edit with the existing date picker.
- Idempotent import of the 804 rows.

## Non-goals

- `Resumen 3T`, `Balance 26`, and `Caja especial`.
- A new role or capability.
- Editing players, categories, or collaborators in this feature.
- Public receipts.
- Push or pull request unless the user asks.

## Tasks

- [x] T1 Add `ThirdTimeFee` and a hand-written migration. Restrict deletes of a player, category, or collaborator that still has fees.
- [x] T2 Parse a `3er Tiempo` row into the sheet contract, with tests for the date, status, nullable amount, player and controller identity, a numeric comprobante, and a Drive link.
- [x] T3 Add list query, overview cards, and form validation, with tests.
- [x] T4 Show `3er Tiempo` in the menu with `Clock3` for roles that can register movements.
- [x] T5 Replace a new `/third-time` route with the mobile-first ledger: cards, drawer filters, pagination, and empty state.
- [x] T6 Add create and edit, the date picker, and private receipt upload.
- [x] T7 Import the workbook rows and copy Drive receipts into private Blob, idempotent by legacy row and Drive file id. The 804 rows are stored. After the 29 Drive files were shared like the Gastos receipts, the copy stored 29 private Blob objects and reused 3.

## Acceptance

- A signed-in administrator, coordinator, or collaborator sees `3er Tiempo` after Gastos and can list, filter, create, and edit a fee on `/third-time`.
- Jugadora comes from `Player`. Categoría comes from `Category`. Control comes from `Collaborator`.
- Month and year shown in the UI are derived from `Fecha`.
- A new comprobante file is stored as a private Blob pathname and can be opened by someone who may register movements.
- Importing the sheet twice does not duplicate rows or Blob objects.
- `pnpm test` passes for the parser, navigation, and ledger behavior.

## Progress

Branch `feat/third-time` points at current `master` (`23a2b87`). T1–T7 are in the working tree. No commit yet. The package writer failed, so the parent wrote the model, parser, and import. A native worker wrote the ledger UI.

## Verification

- T1: `pnpm exec prisma validate` exit 0. `pnpm exec prisma generate` exit 0. `prisma migrate deploy` applied `20261015160000_third_time_fees`.
- T2: RED was the missing parser module. GREEN is 4 passing tests.
- T3: RED was the missing helper module. GREEN is 7 passing tests.
- T4: RED was the missing menu link. GREEN is the navigation suite, 3 passing. Lucide `Clock3` is exported.
- T5–T6: `pnpm exec tsc --noEmit` exit 0. `pnpm test` exit 0, 96 tests, then the import resolver brought the suite to 99.
- T7: dry-run resolved 804 rows and 32 Drive links. Import stored 804 fees. The first Blob attempt got a Google sign-in page for every file. After those files were shared to anyone with the link, the same importer copied 29 private Blob receipts and reused 3 shared paths. `receiptFailures` was empty. One directory player is stored as `Eva` while the sheet still says `Ahumada, Eva`; the resolver follows the workbook roster `legacyId`.
- Signed-in browser check of `/third-time` is still pending.

## Next step

Open `/third-time` while signed in and confirm the imported October list, a new cuota, and a comprobante. Commit only if you ask.
