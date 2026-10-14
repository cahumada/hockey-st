export function loadFieldEncryptionKey(raw: string | undefined): Buffer | null {
  if (!raw?.trim()) {
    return null;
  }

  const key = Buffer.from(raw.trim(), "base64");
  return key.length === 32 ? key : null;
}

export function loadFieldEncryptionKeyFromEnv(): Buffer | null {
  return loadFieldEncryptionKey(process.env.ENCRYPTION_KEY);
}
