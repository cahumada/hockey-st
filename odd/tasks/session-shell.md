# Session shell

## Objective

Send an authenticated session to `/dashboard`, open that page to every role, show the shell in Spanish, and replace the navbar sign-out button with the Google profile image and a menu for Perfil and Cerrar sesión.

## Decision

The user chose: always redirect to `/dashboard`, and open the panel to any authenticated role. Administrator and coordinator keep `club-dashboard` at scope `all`. Collaborator keeps scope `own`. Player, parent, and visitor gain `club-dashboard` at scope `own`. Other capabilities stay unchanged.

## Scope

- `/` and `/sign-in` redirect to `/dashboard` when `session.user.id` is present.
- Google sign-in uses `redirectTo: "/dashboard"`.
- User-visible menu, page, form, and validation copy is Spanish.
- The navbar shows the Google profile image. The avatar menu items are Perfil (`/account`) and Cerrar sesión.
- The sidebar does not list Perfil. That link lives only in the avatar menu.

## Non-goals

- Finance figures, role assignment, or roster rules.
- Changing capabilities other than `club-dashboard`.
- A commit, push, or pull request unless the user asks.

## Constraints

- Call `await io()` from `next/cache` before `auth()`. `cacheComponents` draws a nonce during prerender.
- Code identifiers, filenames, and comments stay in English. Only user-visible copy is Spanish.
- Do not commit unless the user explicitly asks.

## Tasks

- [x] S1 Open `club-dashboard` to every role and redirect an existing session from `/` and `/sign-in` to `/dashboard`.
- [x] S2 Translate user-visible shell, page, roster, and validation copy to Spanish.
- [x] S3 Show the Google profile image in the navbar with Perfil and Cerrar sesión.

## Spanish copy

| Current | Spanish |
| --- | --- |
| Account | Perfil |
| Dashboard | Panel |
| Movements | Movimientos |
| Roles | Roles |
| Players | Jugadoras |
| Club report | Informe del club |
| Parent report | Informe de familias |
| Administrator | Administrador |
| Coordinator | Coordinador |
| Collaborator | Colaborador |
| Player | Jugadora |
| Parent | Familia |
| Visitor | Visitante |
| Sign in | Ingresar |
| Sign in with Google | Ingresar con Google |
| Sign out | Cerrar sesión |
| Close menu / Open menu | Cerrar menú / Abrir menú |
| Switch to light theme / Switch to dark theme | Usar tema claro / Usar tema oscuro |
| Loading … | Cargando … |

Home description: "Ingresá con Google para abrir tu cuenta. Las cuentas nuevas quedan como visitantes hasta que un administrador asigna un rol."

Account: "Perfil". "Tu rol es {rol}." "No hay otras herramientas para este rol."

Dashboard title: "Panel". Scope `own`: "Esta vista se limita a tu actividad." Otherwise: "Las cifras del club llegan con el módulo de finanzas."

Movements: "Registrar movimientos". "El registro todavía no está disponible. Las categorías van a salir de la planilla del club."

Roles: "Asignar roles". "Un administrador asigna los roles acá. Las cuentas nuevas de Google quedan como visitantes hasta que se asignan."

Club report: "Informe del club". "El informe de gestión del club todavía no está disponible."

Parent report: "Informe de familias". Linked: "Este informe incluye solo a las jugadoras vinculadas a esta cuenta." All: "Este informe incluye a todos los grupos."

Players page: "Jugadoras". "Agrupadas por categoría. El nombre para mostrar se mantiene hasta guardar nombre y apellido." "Categorías". "No hay jugadoras." "Cargando jugadoras…"

Player card: "Editar", "Nombre para mostrar", "Nombre", "Apellido", "Categoría", "Baja", "Temporal", "Lesión", "Permanente", "Guardando…", "Guardar", "Actualizar baja", "Dar de baja", "Reactivar", "Inactiva", "Activa", "Sin nombre y apellido", "Legajo {id}".

Validation and action messages: "Ingresá el nombre que se muestra de esta jugadora." "Elegí una categoría." "Usá {n} caracteres o menos." "Esta jugadora ya está activa." "Elegí una baja temporal, por lesión o permanente." "No se encontró la jugadora." "Revisá los campos marcados." "Guardado." "Reactivada." "Baja guardada."

## Profile menu

- Data comes from the Auth.js session: `user.image` and `user.name`.
- Allow `https://lh3.googleusercontent.com` in `images.remotePatterns` after checking the Next.js image docs in this repo.
- If the image is missing, show initials from the name, or "ST" when the name is empty.
- Menu: Perfil links to `/account`. Cerrar sesión keeps the existing server `signOut` action with `redirectTo: "/"`.
- Escape and a click outside close the menu.

## Verification

- `npm test` covers the access matrix and the entry-path decision.
- Browser check of `/`, `/sign-in`, the navbar menu, and one protected page after the UI change.

## Progress

S1–S3 are done. The sidebar no longer lists Perfil; that link stays only in the avatar menu. No commit. The native review lineage `review-7278aea00d79cb8b` is blocked: the reliability lens has no configured model.

## Evidence

S1. `gentle-ai-worker` failed before any tool call (`assistant reported an error`). Native general-purpose agent implemented the same surfaces. RED: `npm test` exit 1, 14 pass, 3 fail (player, visitor, and parent `club-dashboard` denied; `authenticated-entry.ts` missing). GREEN: `npm test` exit 0, 18 pass, 0 fail. Spot check: fall-through `club-dashboard` is scope `own`; `redirectSignedInToDashboard` awaits `io()` before `auth()`; Google `redirectTo` is `/dashboard`.

S2. Native fallback writer. RED: `npm test` exit 1, 16 pass, 2 fail on the Spanish roster assertions before `roster.ts` changed. GREEN: `npm test` exit 0, 18 pass. Spot check: menu labels and role labels are Spanish; dashboard copy matches the table.

S3. Native fallback writer. RED: `npm test` exit 1, 18 pass, 1 fail, missing `profile-label.ts`. GREEN: `npm test` exit 0, 21 pass. Parent re-run: `npm test` exit 0, 21 pass, 0 fail. HTTP on port 3005: anonymous `/` and `/sign-in` return 200 in Spanish. Anonymous `/dashboard` renders the loading shell and then `NEXT_REDIRECT;replace;/sign-in;307`. No browser tool and no signed-in session, so the avatar menu and the authenticated redirect were not exercised in a browser. `gentle-ai-verify` failed before any tool call.

Correction. The user said Perfil must not appear in the sidebar. `club-frame.tsx` no longer prepends `{ href: "/account", label: "Perfil" }`; the sidebar renders `links` only. Perfil remains in `profile-menu.tsx`. No component test runner, so this was a structural check, not a RED/GREEN cycle. No browser tool, so the signed-in sidebar was not clicked.
