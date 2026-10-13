# Foundation

## Objective

Create the mobile-first Next.js App Router foundation for Club Atlético San Telmo hockey: PostgreSQL with Prisma ORM 7, Auth.js Google sign-in, shadcn, and server-side role access including a parent/tutor portal.

## Problem

The club tracks hockey income and expenses in a Google Sheet. The application does not exist yet, and the spreadsheet has not been shared, so finance categories must not be invented.

## Why

Parents are the main income source and need their own report. The original role list had no parent. The accepted decision is a parent/tutor role with a portal: Google sign-in, a link to one or more players, and visibility limited to that group's report.

## Scope

- Next.js App Router, TypeScript, mobile-first shell.
- Prisma ORM 7 with the `prisma-client` generator, `prisma.config.ts`, and the PostgreSQL driver adapter.
- Auth.js (`next-auth` v5) with the Google provider and the Prisma adapter.
- Roles: administrator, coordinator, collaborator, player, parent/tutor, visitor.
- New Google users default to visitor. An administrator assigns any other role. Google profile data is not a role source.
- Domain records for `Player` and the parent-to-player link, so the portal constraint exists before finance screens.
- Placeholder routes whose server checks match the access matrix below.
- shadcn baseline.

## Non-goals

- Income and expense categories, amounts, or imports. Those wait for the shared Google Sheet.
- Real dashboard numbers and the two management reports.
- Vercel Blob uploads. Receipt storage is a later finance task.
- Production Google OAuth credentials and a hosted Postgres instance. Local placeholders only.

## Constraints

- Authorization is enforced on the server. Hiding a component is not access control.
- Prisma does not run in the edge proxy. The proxy may refresh the session cookie; role checks live in server layouts and actions.
- Technical artifacts stay in English.
- No commit unless the user explicitly asks.

## Access matrix

| Capability | Administrator | Coordinator | Collaborator | Player | Parent/tutor | Visitor |
| --- | --- | --- | --- | --- | --- | --- |
| Club dashboard | yes | yes | own activity only | no | no | no |
| Register movements | yes | yes | yes | no | no | no |
| Assign roles | yes | no | no | no | no | no |
| Club management report | yes | yes | no | no | no | no |
| Parent report | all groups | all groups | no | no | linked players only | no |

A player account does not see club money. Sports profile data is out of this slice.

## Tasks

- [x] F1 Initialize the Next.js App Router project in this repository.
- [x] F2 Add Prisma ORM 7, the Auth.js tables, `User.role`, `Player`, and `ParentPlayer`.
- [x] F3 Wire Google sign-in, visitor default, and server-side role checks.
- [x] F4 Add the shadcn mobile shell and placeholder routes for the access matrix.
- [x] F5 Document required environment variables without inventing finance fields.

## Acceptance

- The app builds.
- A signed-in user has exactly one role, defaulting to visitor.
- A parent can be linked to more than one player.
- A visitor cannot open club or parent-report routes.
- Finance tables are absent.

## Progress

F1 is done. Next.js 16.4.0 App Router lives in `src/app`, with React 19.3 and Tailwind 4. Package name is `hockey-st`. No git repository and no commit.

F2 is done. Prisma ORM 7.10.0, Auth.js tables, `User.role` default `VISITOR`, `Player`, and `ParentPlayer` are in `prisma/schema.prisma`. `PARENT` is the parent/tutor portal role. The init SQL is in `prisma/migrations/20261012190000_init/migration.sql` and was not applied. No database was provisioned. The generated client is gitignored under `src/generated` and rebuilt by `postinstall`. No git repository and no commit.

F3–F5 are done. Auth.js `next-auth@5.0.0-beta.32` with `@auth/prisma-adapter@2.11.3` uses database sessions. `googleUserSeed` drops any role claim, so Prisma `@default(VISITOR)` remains the role source. `requireAccess` redirects anonymous users to `/sign-in` and calls `notFound()` when the role is denied. There is no `proxy.ts`. shadcn 4.21.4 supplies the mobile shell and placeholder routes. Env vars are in `docs/environment.md`. No finance tables, no Blob, no commit.

`gentle-ai-worker` could not prepare this directory because it is not a git repository. F2 was written by the native fallback agent on the same surfaces.

`create-next-app` refused the existing `.atl/` and `odd/` directories, so the app was generated beside the repo and moved in. pnpm 10.0.0 treats `pnpm-workspace.yaml` without a `packages` field as a broken workspace. That file was removed and `pnpm.ignoredBuiltDependencies` was set in `package.json`.

## Verification

- F1: `pnpm install` completed. `pnpm build` completed. Routes: `/` and `/_not-found`, both static.
- F2: no runnable domain test. There is no database, so a RED test of inserts was not applicable. Structural checks were used instead.
- F2: `pnpm exec prisma validate` exit 0, `pnpm exec prisma generate` exit 0, `pnpm build` exit 0.
- F2: schema models are Account, Session, User, VerificationToken, Player, and ParentPlayer. Finance models are absent.
- F2: migration SQL was created and not applied. `prisma migrate dev` was not run.
- F3 RED: `pnpm test` failed with `ERR_MODULE_NOT_FOUND` for `src/lib/access.ts` and `src/lib/google-profile.ts` before those modules existed.
- F3 GREEN: `pnpm test` exit 0, 7 tests. The matrix covers administrator, coordinator, collaborator, player, visitor, and parent. The Google seed test rejects a role claim.
- F3/F4: `pnpm exec prisma validate` exit 0 and `pnpm build` exit 0 after the shell, reported by the native worker and not re-run by the parent after the doc edit.
- F4 HTTP: `pnpm dev` on port 3000. `/` returns the landing copy and a link to `/sign-in`. `/sign-in` returns the Google button. `/dashboard`, `/movements`, `/roles`, `/reports/club`, `/reports/parents`, and `/account` render the suspense shell and then `NEXT_REDIRECT;replace;/sign-in;307` from `requireSession`. No browser tool was available. A signed-in visitor was not exercised; denial for that role is the unit test.
- Not run: lint. ESLint 9.39.5 is deprecated by the template.
- Not run: `prisma migrate`. No database was provisioned.
- pnpm skipped build scripts for `prisma` and `@prisma/engines`. Generate still succeeded.
- No commit. The feature constraint says not to commit unless asked. A git repository exists with no commits.

## Next step

The jugadoras load is tracked in `odd/tasks/player-roster.md`. Income and expense categories still wait for an explicit finance slice.
