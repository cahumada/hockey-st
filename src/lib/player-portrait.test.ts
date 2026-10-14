import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultPlayerAvatarSrc,
  maxAvatarBytes,
  playerPortraitSrc,
  validateAvatarFile,
} from "./player-portrait.ts";

test("custom portrait wins over a linked Google image", () => {
  assert.equal(
    playerPortraitSrc({
      id: "player 1",
      avatarPath: "players/player-1/avatar-abc",
      googleImage: "https://lh3.googleusercontent.com/a/photo",
    }),
    "/api/players/player%201/avatar",
  );
});

test("linked Google image is used when nobody uploaded a photo", () => {
  assert.equal(
    playerPortraitSrc({
      id: "player-2",
      avatarPath: null,
      googleImage: "  https://lh3.googleusercontent.com/a/photo  ",
    }),
    "https://lh3.googleusercontent.com/a/photo",
  );
});

test("missing Google image falls back to the club portrait", () => {
  assert.equal(
    playerPortraitSrc({
      id: "player-3",
      avatarPath: "   ",
      googleImage: "  ",
    }),
    defaultPlayerAvatarSrc,
  );
  assert.equal(defaultPlayerAvatarSrc, "/brand/player-avatar.png");
});

test("avatar upload accepts jpeg, png, and webp up to 5 MB", () => {
  assert.deepEqual(validateAvatarFile({ type: "image/jpeg", size: maxAvatarBytes }), {
    ok: true,
  });
  assert.deepEqual(validateAvatarFile({ type: "image/png", size: 1 }), { ok: true });
  assert.deepEqual(validateAvatarFile({ type: "image/webp", size: 1 }), { ok: true });
});

test("avatar upload rejects an empty file, another type, and a file over 5 MB", () => {
  assert.deepEqual(validateAvatarFile({ type: "image/jpeg", size: 0 }), {
    ok: false,
    message: "Elegí una imagen.",
  });
  assert.deepEqual(validateAvatarFile({ type: "image/gif", size: 20 }), {
    ok: false,
    message: "Usá una imagen JPEG, PNG o WebP.",
  });
  assert.deepEqual(validateAvatarFile({ type: "image/jpeg", size: maxAvatarBytes + 1 }), {
    ok: false,
    message: "La imagen tiene que pesar 5 MB o menos.",
  });
});
