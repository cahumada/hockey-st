import { decryptDni, maskDni } from "./player-dni.ts";
import { loadFieldEncryptionKeyFromEnv } from "./field-encryption.ts";

export function maskedStoredDni(
  ciphertext: string | null | undefined,
  key: ReturnType<typeof loadFieldEncryptionKeyFromEnv>,
): string | null {
  if (!ciphertext?.trim()) {
    return null;
  }

  if (!key) {
    return "Registrado";
  }

  const normalized = decryptDni(ciphertext, key);
  return normalized ? maskDni(normalized) : "Registrado";
}

export { loadFieldEncryptionKeyFromEnv } from "./field-encryption.ts";
