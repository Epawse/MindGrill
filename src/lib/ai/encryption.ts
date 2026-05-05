/**
 * AES-256-GCM encryption/decryption for user API keys.
 *
 * Keys are encrypted server-side before storage in Supabase.
 * The `ENCRYPTION_KEY` env var must be a 32-byte hex string (64 hex chars).
 * Each encryption generates a random 12-byte IV, stored alongside the ciphertext
 * as `{iv_hex}:{ciphertext_hex}`.
 *
 * Per D1.2: User keys bypass the env-key blacklist entirely.
 * Per research: Node.js `crypto` module, `export const runtime = "nodejs"`.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Read the 32-byte encryption key from env. Throws if missing or wrong length. */
function getEncryptionKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "ENCRYPTION_KEY env var is required for user key encryption. " +
        "Set it to a 64-char hex string (32 bytes).",
    );
  }
  if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(
      "ENCRYPTION_KEY must be a 64-char hex string (32 bytes). " +
        `Got ${hex.length} chars.`,
    );
  }
  return Buffer.from(hex, "hex");
}

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_BYTES = 16; // 128-bit auth tag

/**
 * Encrypt a plaintext API key. Returns `{iv}:{ciphertext}` as hex strings.
 *
 * Format: `<iv_hex>:<ciphertext_with_auth_tag_hex>`
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Store auth tag appended to ciphertext (GCM convention)
  const combined = Buffer.concat([encrypted, authTag]);
  return `${iv.toString("hex")}:${combined.toString("hex")}`;
}

/**
 * Decrypt a stored encrypted key string back to plaintext.
 *
 * Input format: `<iv_hex>:<ciphertext_with_auth_tag_hex>`
 */
export function decrypt(stored: string): string {
  const key = getEncryptionKey();
  const colonIdx = stored.indexOf(":");
  if (colonIdx === -1) {
    throw new Error("Invalid encrypted key format: missing IV separator");
  }

  const ivHex = stored.slice(0, colonIdx);
  const combinedHex = stored.slice(colonIdx + 1);

  const iv = Buffer.from(ivHex, "hex");
  const combined = Buffer.from(combinedHex, "hex");

  if (combined.length < AUTH_TAG_BYTES) {
    throw new Error("Invalid encrypted key: ciphertext too short");
  }

  // Split combined into ciphertext and auth tag
  const ciphertext = combined.subarray(0, combined.length - AUTH_TAG_BYTES);
  const authTag = combined.subarray(combined.length - AUTH_TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Generate a key hint for display: first 4 chars + "..." + last 4 chars.
 * e.g. "sk-abc...3fg7"
 * For keys shorter than 12 chars, show first 3 + "..." + last 3.
 */
export function generateKeyHint(apiKey: string): string {
  if (apiKey.length < 8) {
    // Very short key — just show prefix
    return `${apiKey.slice(0, 3)}...`;
  }
  // 8+ chars: show first 4 + "..." + last 4
  const prefix = apiKey.slice(0, 4);
  const suffix = apiKey.slice(-4);
  return `${prefix}...${suffix}`;
}