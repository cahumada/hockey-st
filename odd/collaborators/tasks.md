# Collaborators tasks

Mirror of `odd/tasks/collaborators.md`.

- [x] C1 Validate the Colaboradores sheet as a typed dataset.
- [x] C2 Add `Collaborator` in Prisma, migrate, and seed.
- [x] C3 Allow administrator and coordinator to manage collaborators.
- [x] C4 Show the collaborator directory.
- [x] C5 Edit kind and category, and let an administrator link a user and role.
- [x] C6 Add a collaborator from the directory. The next legacy id is assigned on save. The new person starts without a linked account.

Verified 2026-10-14. `pnpm test` 60/60. Migration already applied. Seed read-back matches the 10 sheet rows. C6 adds a collaborator with the next legacy id and no linked account. Delivery commit is on `feat/collaborators`.
