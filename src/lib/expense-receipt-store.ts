import { del, get, put } from "@vercel/blob";

export async function savePrivateReceipt(
  expenseId: string,
  file: File,
  folder = "expenses",
): Promise<{ pathname: string; contentType: string }> {
  const blob = await put(`${folder}/${expenseId}/receipt.${extensionFor(file.type)}`, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type,
  });

  return { pathname: blob.pathname, contentType: file.type };
}

export async function readPrivateReceipt(pathname: string) {
  return get(pathname, { access: "private", useCache: false });
}

export async function removePrivateReceipt(pathname: string): Promise<void> {
  await del(pathname);
}

function extensionFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "application/pdf") return "pdf";
  return "jpg";
}
