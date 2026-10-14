import { del, get, put } from "@vercel/blob";

export async function savePrivateAvatar(playerId: string, file: File): Promise<string> {
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const blob = await put(`players/${playerId}/avatar.${extension}`, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type,
  });

  return blob.pathname;
}

export async function readPrivateAvatar(pathname: string) {
  return get(pathname, { access: "private", useCache: false });
}

export async function removePrivateAvatar(pathname: string): Promise<void> {
  await del(pathname);
}
