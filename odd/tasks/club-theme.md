# Club theme

## Objective

Style the app from the San Telmo crest and replace the bottom bar with a navbar plus sidebar that collapses on small screens.

## Problem

`src/app/globals.css` is the neutral shadcn palette. `ClubShell` is a header plus a fixed bottom link row, so there is no light/dark club theme and no desktop sidebar.

## Why

The crest is the club mark the operator asked to use. The shell has to work on a phone and on a wider screen without a second navigation pattern.

## Scope

- Light and dark CSS variables from the measured crest colors.
- Class-based theme (`html.dark`) with system default and a toggle in the navbar.
- Protected shell: sticky navbar and a sidebar of the existing capability links.
- Below the `md` breakpoint, the sidebar is a drawer opened from the navbar.

## Non-goals

- New routes, roles, or access checks.
- Restyling each page beyond the shared tokens.
- A public marketing navbar. Home and sign-in keep their cards and inherit the theme.

## Decision

Crest samples from `IMG_8531-855x1024.webp`: navy `#0F4285` (`oklch(0.388 0.124 257.4)`) and celeste `#00A8E3` (`oklch(0.688 0.141 232.6)`). Light mode uses navy as primary on a near-white celeste tint. Dark mode uses a deep navy surface and a lifted celeste as primary. Default theme follows the system and is stored by `next-themes`.

Navigation: the navbar stays visible. From `md` up the sidebar is a static column. Below `md` a menu button in the navbar opens the same links as a modal drawer (backdrop, Escape, and link activation close it). The bottom bar goes away. Touch targets stay at least 44px.

## Tasks

- [x] T1 Replace neutral tokens in `src/app/globals.css` with the San Telmo light and dark palette.
- [x] T2 Add the class theme provider and a navbar toggle.
- [x] T3 Rebuild `ClubShell` as navbar + sidebar, with the mobile drawer.
- [x] T4 Check both themes and both widths. The operator approved the signed-in light/dark toggle and the mobile drawer.

## Acceptance

- Light and dark surfaces use the navy and celeste above, not the neutral gray scale.
- The toggle switches `html.dark` and survives reload.
- Desktop shows navbar and sidebar together. A narrow viewport shows only the navbar until the menu opens the sidebar.
- Capability links and sign-out stay role-based and server-backed, as they are today.

## Verification

No component test runner exists, and these changes are CSS plus layout. A RED test would not describe a failing behavior the suite can run. Check with lint, a typecheck, and a browser pass of `/` plus the protected shell at desktop and mobile widths, in both themes.

## Progress

T1–T4 are done. Served CSS on port 3005: light `--primary` `#0f4285`, celeste stripe `#03a8e3`, dark `--primary` `#41b8ef` on `#08162a`. `/`, `/sign-in`, and `/brand/san-telmo-crest.webp` return 200. Unauthenticated `/account` redirects to `/sign-in` after `await io()` in `requireSession`. The operator approved the signed-in toggle and drawer. Work-unit commit: `15b2f16f6501f57224704800ec1d3ee09bb383e9` on `feat/club-theme`.
