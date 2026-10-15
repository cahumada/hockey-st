# Forms

Interactive forms in this app use [React Hook Form](https://react-hook-form.com/) on the client.

## Conventions

- Register fields with `register` or controlled helpers from React Hook Form. Avoid uncontrolled `<form action>` for profile and roster modals.
- Reuse shared validators in `src/lib/` (for example `validatePlayerProfileFormValues`) so client feedback matches server actions.
- Prefer `mode: "onTouched"` with `reValidateMode: "onChange"` so errors appear after the user leaves a field and clear while they fix input.
- Map server action field errors with `setError` so API failures show on the right control.
- Keep modal footers fixed: submit handlers call `handleSubmit` from React Hook Form; field markup stays in the scrollable body.

## Server actions

Server actions still validate with the same parsing functions. Client validation improves UX; the server remains the source of truth for authorization and persistence.

## Player profile (create / edit)

The roster modals use `PlayerProfileFormFields` and `validatePlayerProfileFormValues`.

| Label (UI) | Field | Notes |
| --- | --- | --- |
| Alias | `displayName` | Required. Shown as the main title on roster cards. |
| Nombre | `givenName` | Optional. With apellido, shown under the alias on cards. |
| Apellido | `familyName` | Optional. |

Optional profile fields (birth date, membership, jersey number, DNI, join date) share the same modal. DNI requires `ENCRYPTION_KEY`; see [environment.md](./environment.md).

Avatar upload is separate: crop from the card camera action, not from the profile modal.

## Expense (create / edit)

The movements ledger uses `validateExpenseFormValues`. Tipo and colaborador come from the existing catalogs. Total is unit amount times quantity. Importe and cantidad use `FormNumeric`: the field shows an Argentine number, and the stored value stays a decimal string. Importe includes the peso mark. The comprobante is optional and is stored in private Blob when `BLOB_READ_WRITE_TOKEN` is set. The create and edit modals pick it with the reusable `FileUpload` drop zone.

## Adding a form

1. Define or reuse value types and validators under `src/lib/`.
2. Create a client component with `useForm`, wired to those validators.
3. On success, call the existing server action with `FormData` or a typed payload built from form values.
4. Document any new environment dependency in [environment.md](./environment.md).
