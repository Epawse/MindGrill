import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { encrypt, decrypt, generateKeyHint } from "@/lib/ai/encryption";

describe("encryption", () => {
  const ORIGINAL_ENV = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a valid 32-byte (64 hex char) encryption key for tests
    process.env.ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterEach(() => {
    if (ORIGINAL_ENV !== undefined) {
      process.env.ENCRYPTION_KEY = ORIGINAL_ENV;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe("encrypt + decrypt round-trip", () => {
    it("encrypts and decrypts a key back to original", () => {
      const apiKey = "sk-abc1234567890def";
      const encrypted = encrypt(apiKey);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    it("produces different ciphertexts for same plaintext (random IV)", () => {
      const apiKey = "sk-same-key-encrypts-differently";
      const enc1 = encrypt(apiKey);
      const enc2 = encrypt(apiKey);
      // Different IVs mean different ciphertexts
      expect(enc1).not.toBe(enc2);
      // But both decrypt to the same value
      expect(decrypt(enc1)).toBe(apiKey);
      expect(decrypt(enc2)).toBe(apiKey);
    });

    it("handles long keys", () => {
      const apiKey = "sk-proj-" + "a".repeat(80);
      const encrypted = encrypt(apiKey);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    it("handles short keys", () => {
      const apiKey = "abc";
      const encrypted = encrypt(apiKey);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    it("handles empty string", () => {
      const apiKey = "";
      const encrypted = encrypt(apiKey);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(apiKey);
    });

    it("handles keys with special characters", () => {
      const apiKey = "key-with+special/chars=and&more!";
      const encrypted = encrypt(apiKey);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(apiKey);
    });
  });

  describe("encrypt format", () => {
    it("produces {iv}:{ciphertext} format", () => {
      const encrypted = encrypt("sk-test-key");
      const parts = encrypted.split(":");
      expect(parts).toHaveLength(2);
      // IV is 12 bytes = 24 hex chars
      expect(parts[0]).toHaveLength(24);
      // Each hex char should be valid
      expect(parts[0]).toMatch(/^[0-9a-f]+$/);
      expect(parts[1]).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("decrypt error cases", () => {
    it("throws if ENCRYPTION_KEY is missing", () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt("test")).toThrow("ENCRYPTION_KEY");
    });

    it("throws if ENCRYPTION_KEY is wrong length", () => {
      process.env.ENCRYPTION_KEY = "tooshort";
      expect(() => encrypt("test")).toThrow("64-char hex string");
    });

    it("throws on malformed stored string (no colon)", () => {
      expect(() => decrypt("invalidnoformat")).toThrow("missing IV separator");
    });

    it("throws on ciphertext that has been tampered with", () => {
      const encrypted = encrypt("sk-original");
      const parts = encrypted.split(":");
      // Flip a byte in the ciphertext
      const tamperedCt =
        parts[1].slice(0, 4) +
        (parts[1][4] === "0" ? "1" : "0") +
        parts[1].slice(5);
      expect(() => decrypt(`${parts[0]}:${tamperedCt}`)).toThrow();
    });
  });

  describe("generateKeyHint", () => {
    it("shows first 4 and last 4 chars for long keys", () => {
      expect(generateKeyHint("sk-abc1234567890def")).toBe("sk-a...0def");
    });

    it("shows first 3 and ellipsis for short keys (<8 chars)", () => {
      expect(generateKeyHint("shortk")).toBe("sho...");
    });

    it("handles very short keys", () => {
      expect(generateKeyHint("abc")).toBe("abc...");
    });

    it("handles key exactly 8 chars", () => {
      expect(generateKeyHint("12345678")).toBe("1234...5678");
    });

    it("handles key exactly 9 chars", () => {
      expect(generateKeyHint("123456789")).toBe("1234...6789");
    });

    it("handles typical OpenAI key format", () => {
      expect(generateKeyHint("sk-proj-abcdef1234567890")).toBe(
        "sk-p...7890",
      );
    });
  });
});