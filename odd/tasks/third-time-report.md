# Third-time category report

## Objective

Add a staff matrix under a new **Reportes** menu group: pick a category and a year, see one row per player in that category, one column per month, the recorded amount in each cell, totals, and a color for Pagado, Pendiente, and Exento.

## Why

The `/third-time` ledger is a movement list. Staff need the workbook-style grid: who in the category paid which month.

## Decisions

- Branch `feat/third-time-report`. No schema change. No new capability.
- Menu group `reports`, label `Reportes`, icon key `reports` (Lucide `Table2` in `club-frame.tsx`). One child: label `3er Tiempo`, href `/reports/third-time`, icon `third-time`. Place the link after the maintenance group and before `Informe del club`. Leave `Informe del club` and `Informe de familias` as flat links.
- Intended access is documented in `docs/third-time-report-access.md` and is not enforced yet. The screen still uses `register-movements` (administrator, coordinator, collaborator, every category).
- Query `category` and `year`. Year defaults to the club calendar year from `clubDate`. An invalid year falls back to that default. No category selected means the empty prompt, not a guessed category.
- Rows are players whose current `categoryCode` is the selection, sorted with `localeCompare(..., "es")`. Every roster status is included.
- Columns are the twelve months of the selected year. Month comes from the UTC calendar date of `chargedOn` (`@db.Date`).
- A cell includes non-deleted fees for that player, that `categoryCode`, and that month. Fees for another category, another year, another player, or `deletedAt` set are out.
- Amounts are decimal strings. Sum with `sumThirdTimeAmounts`. Null amounts do not become zero inside the cell. A cell with fees but no numeric amount stays `amount: null`.
- Cell status: `EMPTY` when there is no fee; the shared status when every fee matches; `MIXED` when statuses differ. Color reuses the ledger tones: `PAID` active, `PENDING` temporary, `EXEMPT` inactive. `MIXED` is muted and labeled, not a new status color. Empty cells have no status fill. `MIXED` exists only on the grid, so one cell can stand for several fees. The charts count each fee as Pagado, Pendiente, or Exento.
- Query `month` selects the expected-versus-collected chart and highlights that month. It defaults to the club month. Category and year scope the grid and both charts. The grid keeps all twelve months.
- Expected amount is the category's current third-time rate times the number of players in the grid. Collected amount is the sum of paid fees in the selected month. A category without a rate has no expected total.
- Totals are the last column, the footer row, and the corner. They sum numeric amounts only and are not colored.
- Several fees in one month stay one cell: summed amount, resolved status.
- Each column (player, month, and total) can be resized while the report is open. Widths stay in the page for that view and are not saved. A column cannot shrink below its minimum: 96px for the player, 56px for a month, 80px for the total.

## Non-goals

- Moving the existing club and family reports into the group.
- Editing fees from the grid.
- A parent-facing slice of this matrix.
- Push, pull request, or commit unless the user asks.

## Tasks

- [x] T1 Add `buildThirdTimeCategoryReport` and the year/category query parser, test-first.
- [x] T2 Show `Reportes` / `3er Tiempo` for roles that can register movements.
- [x] T3 Render `/reports/third-time`: category and year selectors, twelve-month table, colored amounts, totals, legend.
- [x] T4 Let each column be resized while viewing the report.
- [x] T5 Add the monthly status mix and the expected-versus-collected chart for the selected month.

## Acceptance

- An administrator, coordinator, or collaborator sees `Reportes` and, under it, `3er Tiempo`.
- Choosing a category and a year shows that category's players and January–December.
- Each occupied cell shows the recorded amount, or a clear empty-amount label, and a status color that is also named in text.
- Row, column, and grand totals match the sum of numeric amounts.
- `pnpm test` passes for the matrix and the navigation change.

## Verification

Report tests 23 pass, including status shares, mixed-month fee counts, and the expected-versus-collected difference. `tsc --noEmit` exit 0. The charts were not opened in a browser in this session.

## Commits

None yet.
