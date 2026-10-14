# San Telmo Hockey

Mobile-first web app for Club Atlético San Telmo hockey. Google sign-in opens an account, and an administrator assigns the role. Finance categories, amounts, and reports are not part of this slice.

## Roster (`/players`)

Coordinators with `manage-roster` browse a filterable roster board, create and edit players in modals, and manage inactive status separately from profile edits. Cards show **alias** (`displayName`) with legal **nombre** and **apellido** underneath, optional profile rows (age, DNI, membership, join date), and a jersey dorsal avatar when a jersey number is set. Photos use Google, a club default, or a private cropped upload (Vercel Blob).

Run Prisma migrations after pulling. Set `BLOB_READ_WRITE_TOKEN` and `ENCRYPTION_KEY` for avatar upload and DNI storage — see [docs/environment.md](docs/environment.md).

Brand assets live under `public/brand/`; source artwork for designers is kept in `docs/`.

## Scripts

- `pnpm dev` starts the development server on port 3005.
- `pnpm test` runs unit tests under `src/lib/`.
- `pnpm build` creates the production build.

## Environment

See [docs/environment.md](docs/environment.md).

## Forms

Client forms use React Hook Form. See [docs/forms.md](docs/forms.md).
