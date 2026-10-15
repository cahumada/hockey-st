# Expense ledger

## Objective

Replace the movements placeholder with a Gastos ledger that follows the 2026 workbook sheet `Gastos`, reuses `ExpenseType` and `Collaborator`, and stores each comprobante in private Vercel Blob.

## Problem

Club expenses live only on `docs/legacy/2026-Hockey San Telmo.xlsx`, sheet `Gastos` (133 data rows, columns A–K). `/movements` is still a placeholder. Receipts are Google Drive links (`https://drive.google.com/file/d/{id}/view`), 106 files, all on `drive.google.com`. A sample file responds `200` with `Content-Type: image/png` without extra Google credentials.

## Why

Staff already register movements in that sheet. The app has the type catalog and the people directory, and avatars already use private Blob. Expenses should use those structures instead of a second free-text list.

## Sheet contract

Header row: Fecha, Tipo, Importe, Cantidad, Total, Colaborador, Comprobante, Observaciones, Verificado, Mes, Año.

- `Total` is the formula `Importe * Cantidad`. Do not store it.
- `Mes` and `Año` are formulas from `Fecha`. Do not store them. Format month in Spanish when the UI needs the sheet label (`03 - marzo`).
- Excel dates are serials. Epoch is 1899-12-30. Row 2 serial `46082` is 2026-03-01, and the formula label is `03 - marzo`. The note `tiene fecha 14/2/2026` is an observation, not the row date.
- `Verificado` is `1` or `0`. In this workbook it matches “has a comprobante” on every row. Keep it as its own field.
- Tipos match `legacyExpenseTypes`, except one typo: `Afajores` means `Alfajores`.
- Colaborador labels are not the directory display name:
  - `Anabella - Coordinador` → display name `Anabella`
  - `9na - Natalia Palladino` → category `9na` and display name `Natalia Palladino`
- 27 rows have no comprobante.

## Scope

- Branch `feat/expense-ledger`.
- Model `Expense` related to `ExpenseType` and `Collaborator`, with optional legacy row identity, private receipt pathname, content type, and Drive file id.
- Pure parser for a Gastos row.
- `/movements` ledger for roles that already have `register-movements` (administrator, coordinator, collaborator). Same visual language as the collaborator and catalog boards: mobile cards, desktop table, modal create/edit, React Hook Form, status color for verified.
- New receipts upload to private Blob (`BLOB_READ_WRITE_TOKEN`), same access mode as player avatars.
- Idempotent import of the 133 rows. Copy each public Drive file into private Blob. Keep the Drive file id so a rerun does not upload twice.

## Non-goals

- Income, Tercer Tiempo, or Caja especial sheets.
- Editing the expense-type or collaborator catalogs in this feature.
- Making receipts public.
- A Google OAuth client. These links are reachable with a normal download URL.
- Git commit, push, or pull request unless the user asks.

## Tasks

- [x] E1 Add the `Expense` model and a hand-written migration. Restrict deletes of a type or collaborator that still has expenses.
- [x] E2 Parse a Gastos row into the sheet contract, with tests for the date, the `Afajores` alias, both collaborator labels, the derived total, and the Drive file id.
- [x] E3 Replace the `/movements` placeholder with the ledger UI and private receipt upload for new expenses.
- [x] E4 Import the workbook rows and copy Drive receipts into private Blob, idempotent by legacy row and Drive file id.

## Acceptance

- A signed-in administrator, coordinator, or collaborator can list, create, and edit a gasto on `/movements`.
- Tipo comes from `ExpenseType`. Colaborador comes from `Collaborator`.
- Total shown in the UI is unit amount times quantity.
- A new comprobante is stored as a private Blob pathname and can be opened by someone who may register movements.
- Importing the sheet twice does not duplicate rows or Blob objects.
- `npm test` passes for the new parser, access, and ledger behavior.

## Progress

Branch `feat/expense-ledger` created from `master`. The package writer was unusable, so the tasks ran here. Both migrations are applied on the Prisma Postgres database. The import stored 133 expenses, copied 104 private Blob receipts, and reused 2 shared receipts. No receipt failures. Commits stay with the user.

One Drive file is linked from more than one sheet row, so `legacyDriveFileId` is indexed and not unique.

## Verification

- E1: `pnpm exec prisma validate` exit 0. `pnpm exec prisma generate` exit 0. `prisma migrate deploy` applied `20261015120000_expenses` and `20261015123000_shared_expense_receipts`.
- E2 and the form/browse tests: RED was the missing module, then GREEN. `pnpm test` exit 0, 76 tests, plus the later import resolver tests (2 passing).
- E4: dry-run resolved 133 rows and 106 receipt links. The import finished with `receiptsCopied` 104, `receiptsReused` 2, `receiptFailures` empty.
- Signed-in browser check of `/movements` is still pending. There is no running dev server and no club session in this run.

## Next step

Open `/movements` while signed in as administrator, coordinator, or collaborator and confirm the imported list, a new gasto, and a comprobante. Commit only if you ask.
