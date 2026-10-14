export const defaultPlayerAvatarSrc = "/brand/player-avatar.png";

export const maxAvatarBytes = 5 * 1024 * 1024;

const avatarContentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AvatarFileVerdict = { ok: true } | { ok: false; message: string };

export function playerPortraitSrc(player: {
  id: string;
  avatarPath: string | null;
  googleImage: string | null;
}): string {
  if (player.avatarPath?.trim()) {
    return `/api/players/${encodeURIComponent(player.id)}/avatar`;
  }

  const googleImage = player.googleImage?.trim() ?? "";
  if (googleImage.length > 0) {
    return googleImage;
  }

  return defaultPlayerAvatarSrc;
}

export function validateAvatarFile(file: { type: string; size: number }): AvatarFileVerdict {
  if (file.size <= 0) {
    return { ok: false, message: "Elegí una imagen." };
  }

  if (!avatarContentTypes.has(file.type)) {
    return { ok: false, message: "Usá una imagen JPEG, PNG o WebP." };
  }

  if (file.size > maxAvatarBytes) {
    return { ok: false, message: "La imagen tiene que pesar 5 MB o menos." };
  }

  return { ok: true };
}
