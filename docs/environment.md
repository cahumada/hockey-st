# Environment

The app reads these variables:

- `DATABASE_URL`: PostgreSQL connection string used by Prisma at runtime, for migrations, and for seed. `prisma generate` does not require it, so `pnpm install` can finish when the variable is absent.
- `AUTH_SECRET`: secret Auth.js uses to encrypt the session cookie.
- `AUTH_GOOGLE_ID`: Google OAuth client id.
- `AUTH_GOOGLE_SECRET`: Google OAuth client secret.
- `AUTH_URL`: public base URL of this app, used for Auth.js callbacks. Local development uses `http://localhost:3005`.
- `BLOB_READ_WRITE_TOKEN`: read-write token for the private Vercel Blob store. Player photos and expense receipts are uploaded with `access: "private"`. Roster managers read photos. Roles that can register movements read receipts.
- `ENCRYPTION_KEY`: base64-encoded 32-byte AES key for encrypting sensitive field values in PostgreSQL (player DNI today; other fields may use the same key). Generate with `openssl rand -base64 32`. Without it, roster forms still work but encrypted fields such as DNI cannot be stored; the UI warns coordinators and blocks submit while DNI is filled in.

Google is not a role source. New users are visitors until an administrator assigns another role.

Expense receipts use the same private Blob store as player photos. A missing token blocks only the file; the rest of the expense can still be saved if no file is attached.
