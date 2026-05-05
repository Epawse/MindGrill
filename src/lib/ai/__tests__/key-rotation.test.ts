import { describe, expect, it, beforeEach, vi } from "vitest";

import {
  parseApiKeys,
  selectKey,
  blacklistKey,
  isBlacklisted,
  shouldBlacklist,
  availableKeyCount,
  clearBlacklist,
  blacklistSize,
  keyPrefix,
} from "@/lib/ai/key-rotation";

describe("key-rotation", () => {
  beforeEach(() => {
    clearBlacklist();
  });

  // ---------------------------------------------------------------------------
  // parseApiKeys
  // ---------------------------------------------------------------------------
  describe("parseApiKeys", () => {
    it("parses comma-separated keys", () => {
      expect(parseApiKeys("sk-abc,sk-def,sk-ghi")).toEqual([
        "sk-abc",
        "sk-def",
        "sk-ghi",
      ]);
    });

    it("returns single key in array", () => {
      expect(parseApiKeys("sk-single")).toEqual(["sk-single"]);
    });

    it("trims whitespace around keys", () => {
      expect(parseApiKeys(" sk-abc , sk-def ")).toEqual(["sk-abc", "sk-def"]);
    });

    it("filters out empty segments", () => {
      expect(parseApiKeys("sk-abc,,sk-def,")).toEqual(["sk-abc", "sk-def"]);
    });

    it("returns empty array for undefined", () => {
      expect(parseApiKeys(undefined)).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(parseApiKeys("")).toEqual([]);
    });

    it("handles keys with spaces around commas", () => {
      expect(parseApiKeys("sk-abc , sk-def")).toEqual(["sk-abc", "sk-def"]);
    });
  });

  // ---------------------------------------------------------------------------
  // keyPrefix
  // ---------------------------------------------------------------------------
  describe("keyPrefix", () => {
    it("returns first 8 chars of key", () => {
      expect(keyPrefix("sk-1234567890abcdef")).toBe("sk-12345");
    });

    it("returns entire key if shorter than 8 chars", () => {
      expect(keyPrefix("sk-ab")).toBe("sk-ab");
    });
  });

  // ---------------------------------------------------------------------------
  // selectKey
  // ---------------------------------------------------------------------------
  describe("selectKey", () => {
    it("returns null for empty array", () => {
      expect(selectKey([])).toBeNull();
    });

    it("returns the only key when one key is provided", () => {
      expect(selectKey(["sk-abc"])).toBe("sk-abc");
    });

    it("returns one of the available keys", () => {
      const keys = ["sk-aaa", "sk-bbb", "sk-ccc"];
      const selected = selectKey(keys);
      expect(keys).toContain(selected);
    });

    it("skips blacklisted keys", () => {
      const keys = ["sk-aaa", "sk-bbb"];
      blacklistKey("sk-aaa", 60_000);
      const selected = selectKey(keys);
      expect(selected).toBe("sk-bbb");
    });

    it("returns null when all keys are blacklisted", () => {
      const keys = ["sk-aaa", "sk-bbb"];
      blacklistKey("sk-aaa", 60_000);
      blacklistKey("sk-bbb", 60_000);
      expect(selectKey(keys)).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // blacklistKey / isBlacklisted
  // ---------------------------------------------------------------------------
  describe("blacklistKey / isBlacklisted", () => {
    it("blacklists a key and reports it as blacklisted", () => {
      blacklistKey("sk-test12345678", 60_000);
      expect(isBlacklisted("sk-test12345678")).toBe(true);
    });

    it("uses key prefix for blacklist lookup", () => {
      // Two keys with same prefix should share blacklist status
      blacklistKey("sk-test12345678", 60_000);
      expect(isBlacklisted("sk-test12345678xyz")).toBe(true);
    });

    it("key is not blacklisted after duration expires", () => {
      // Use vi.useFakeTimers to control time
      vi.useFakeTimers();
      blacklistKey("sk-test12345678", 1_000); // 1s blacklist
      expect(isBlacklisted("sk-test12345678")).toBe(true);

      vi.advanceTimersByTime(1_001);
      expect(isBlacklisted("sk-test12345678")).toBe(false);
      vi.useRealTimers();
    });

    it("clearBlacklist removes all entries", () => {
      blacklistKey("sk-aaa", 60_000);
      blacklistKey("sk-bbb", 60_000);
      expect(isBlacklisted("sk-aaa")).toBe(true);
      expect(isBlacklisted("sk-bbb")).toBe(true);

      clearBlacklist();
      expect(isBlacklisted("sk-aaa")).toBe(false);
      expect(isBlacklisted("sk-bbb")).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // shouldBlacklist
  // ---------------------------------------------------------------------------
  describe("shouldBlacklist", () => {
    it("returns true for 401 status code", () => {
      expect(shouldBlacklist({ statusCode: 401 })).toBe(true);
    });

    it("returns true for 429 status code", () => {
      expect(shouldBlacklist({ statusCode: 429 })).toBe(true);
    });

    it("returns true for 503 status code", () => {
      expect(shouldBlacklist({ statusCode: 503 })).toBe(true);
    });

    it("returns true for AI_RetryError name", () => {
      expect(shouldBlacklist({ name: "AI_RetryError" })).toBe(true);
    });

    it("returns false for APICallError without status code (not all API errors are retryable)", () => {
      expect(shouldBlacklist({ name: "APICallError" })).toBe(false);
    });

    it("returns false for 200 status code", () => {
      expect(shouldBlacklist({ statusCode: 200 })).toBe(false);
    });

    it("returns false for 404 status code", () => {
      expect(shouldBlacklist({ statusCode: 404 })).toBe(false);
    });

    it("returns false for null/undefined", () => {
      expect(shouldBlacklist(null)).toBe(false);
      expect(shouldBlacklist(undefined)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // availableKeyCount
  // ---------------------------------------------------------------------------
  describe("availableKeyCount", () => {
    it("returns count of non-blacklisted keys", () => {
      const keys = ["sk-aaa", "sk-bbb", "sk-ccc"];
      blacklistKey("sk-aaa", 60_000);
      expect(availableKeyCount(keys)).toBe(2);
    });

    it("returns all keys when none are blacklisted", () => {
      const keys = ["sk-aaa", "sk-bbb"];
      expect(availableKeyCount(keys)).toBe(2);
    });

    it("returns 0 when all keys are blacklisted", () => {
      const keys = ["sk-aaa", "sk-bbb"];
      blacklistKey("sk-aaa", 60_000);
      blacklistKey("sk-bbb", 60_000);
      expect(availableKeyCount(keys)).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // blacklistSize
  // ---------------------------------------------------------------------------
  describe("blacklistSize", () => {
    it("returns number of active blacklist entries", () => {
      blacklistKey("sk-aaa", 60_000);
      blacklistKey("sk-bbb", 60_000);
      expect(blacklistSize()).toBe(2);
    });

    it("cleans up expired entries when called", () => {
      vi.useFakeTimers();
      blacklistKey("sk-aaa", 1_000);
      vi.advanceTimersByTime(1_001);
      expect(blacklistSize()).toBe(0);
      vi.useRealTimers();
    });
  });
});