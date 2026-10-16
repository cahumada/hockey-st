# Third-time category report tasks

Mirror of `odd/tasks/third-time-report.md`. Intended access: `docs/third-time-report-access.md`.

- [x] T1 Add `buildThirdTimeCategoryReport` and the year/category query parser, test-first.
- [x] T2 Show `Reportes` / `3er Tiempo` for roles that can register movements.
- [x] T3 Render `/reports/third-time`: category and year selectors, twelve-month table, colored amounts, totals, legend.
- [x] T4 Let each column be resized while viewing the report.
- [x] T5 Add the monthly status mix and the expected-versus-collected chart for the selected month.

Report tests 13 pass. Navigation tests 4 pass. `pnpm test` 124 pass, 0 fail. `tsc --noEmit` exit 0. Signed-in browser check was not run.
