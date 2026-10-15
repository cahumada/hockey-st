# Player avatars

## Objective

Show the San Telmo crest from `docs/Escudo.jpeg`, and show a portrait on every player in the roster. A custom upload stored in private Vercel Blob wins. Otherwise use the linked Google profile image. Otherwise use `docs/Avatar.jpeg`.

## Problem

The shell crest still pointed at `public/brand/san-telmo-crest.webp`. Player cards had no portrait. `Player` had no place to store an uploaded photo, and uploads were not wired to Blob.

## Why

Coordinators need to recognize each jugadora in the list. Google covers players who already signed in. Everyone else needs the club default, and a person with roster access must be able to replace that photo.

## Scope

- Serve a resized crest derived from `docs/Escudo.jpeg` in the existing shell mark.
- Serve a resized default portrait derived from `docs/Avatar.jpeg`.
- Portrait order: private blob pathname, then `Player.user.image`, then the default portrait.
- Roster managers upload a JPEG, PNG, or WebP of at most 1 MB from the player card.
- The upload is stored with `access: "private"` and read only through an authenticated route.

## Non-goals

- Letting a player change the photo from `/account`.
- Changing the navbar Google menu image.
- Public blob URLs.
- Committing unless the user asks.

## Tasks

- [x] A1 Resolve the portrait URL with tests.
- [x] A2 Publish the crest and the default portrait.
- [x] A3 Store the private pathname and serve it to roster managers.
- [x] A4 Show the portrait and the upload control on each player card.

## Acceptance

- The shell crest is the provided shield.
- A player with a stored pathname renders `/api/players/{id}/avatar`.
- A linked Google image is used only when no custom photo is stored.
- Every other player renders `/brand/player-avatar.jpeg`.
- An upload of another type, or larger than 1 MB, is rejected in Spanish.
- The avatar route checks `manage-roster` and does not expose the blob URL.

## Verification

A1 RED: `npm test` exit 1, missing `src/lib/player-portrait.ts`, 21 pass, 1 fail. GREEN: `npm test` exit 0, 26 pass, 0 fail.

A2: `public/brand/san-telmo-crest.jpeg` is 427x512 and 54055 bytes. `public/brand/player-avatar.jpeg` is 214x256 and 16734 bytes. Both return HTTP 200 from the server already listening on port 3005. The originals in `docs/` stay as the source files. The old webp is no longer referenced.

A3: `Player.avatarPath` exists in the database and migration `20261013221000_player_avatar_path` is applied. Anonymous `GET /api/players/missing/avatar` returns 307 to `/sign-in`. `pnpm exec next build` exit 0. The avatar route is dynamic. `npx tsc --noEmit` exit 0.

A4: anonymous `/players` renders the loading shell and then `NEXT_REDIRECT;replace;/sign-in;307`. No signed-in browser session, so the card and the upload were not exercised in a browser.

Blob upload itself was not called. `.env` has no `BLOB_READ_WRITE_TOKEN`.

## Progress

A1–A4 are implemented. No commit. Native review lineage `review-d2ffe95a88b7464a` is blocked: no model is configured for `review-risk`.

## Next step

Add `BLOB_READ_WRITE_TOKEN` from a private Vercel Blob store, then upload a photo while signed in as a roster manager. Commit only if asked.
