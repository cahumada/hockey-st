import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

export function normalizeDni(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0) {
    return null;
  }
  if (digits.length < 7 || digits.length > 8) {
    return null;
  }
  return digits;
}

export function maskDni(normalized: string): string {
  const tail = normalized.slice(-4);
  return `•••• ${tail}`;
}

export function encryptDni(normalized: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptDni(payload: string, key: Buffer): string | null {
  const parts = payload.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [ivText, tagText, dataText] = parts;
  try {
    const iv = Buffer.from(ivText, "base64url");
    const tag = Buffer.from(tagText, "base64url");
    const data = Buffer.from(dataText, "base64url");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    const normalized = normalizeDni(decrypted.toString("utf8"));
    return normalized;
  } catch {
    return null;
  }
}

