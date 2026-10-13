# Environment

The app reads these variables:

- `DATABASE_URL`: PostgreSQL connection string used by Prisma at runtime, for migrations, and for seed. `prisma generate` does not require it, so `pnpm install` can finish when the variable is absent.
- `AUTH_SECRET`: secret Auth.js uses to encrypt the session cookie.
- `AUTH_GOOGLE_ID`: Google OAuth client id.
- `AUTH_GOOGLE_SECRET`: Google OAuth client secret.
- `AUTH_URL`: public base URL of this app, used for Auth.js callbacks. Local development uses `http://localhost:3005`.

Google is not a role source. New users are visitors until an administrator assigns another role.

Receipt storage is not part of this slice.
