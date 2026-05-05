import { describe, expect, it } from "vitest";

import { generateCodeString, generateCodeStrings } from "../index";

describe("access-codes", () => {
  // ---------------------------------------------------------------------------
  // generateCodeString
  // ---------------------------------------------------------------------------
  describe("generateCodeString", () => {
    it("returns a string starting with MG-JUDGE-", () => {
      const code = generateCodeString();
      expect(code).toMatch(/^MG-JUDGE-/);
    });

    it("has 12 characters after the prefix", () => {
      const code = generateCodeString();
      const suffix = code.slice("MG-JUDGE-".length);
      expect(suffix.length).toBe(12);
    });

    it("only uses allowed characters in the suffix", () => {
      const code = generateCodeString();
      const suffix = code.slice("MG-JUDGE-".length);
      const allowed = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      for (const ch of suffix) {
        expect(allowed.includes(ch)).toBe(true);
      }
    });

    it("generates different codes on successive calls (extremely unlikely to fail)", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 20; i++) {
        codes.add(generateCodeString());
      }
      // With 12-char cryptographic random suffix, all 20 should be unique.
      expect(codes.size).toBe(20);
    });
  });

  // ---------------------------------------------------------------------------
  // generateCodeStrings
  // ---------------------------------------------------------------------------
  describe("generateCodeStrings", () => {
    it("returns the requested number of codes", () => {
      const codes = generateCodeStrings(5);
      expect(codes.length).toBe(5);
    });

    it("returns unique codes", () => {
      const codes = generateCodeStrings(50);
      const unique = new Set(codes);
      expect(unique.size).toBe(50);
    });

    it("each code matches the MG-JUDGE- format", () => {
      const codes = generateCodeStrings(10);
      for (const code of codes) {
        expect(code).toMatch(/^MG-JUDGE-[A-Z2-9]{12}$/);
      }
    });

    it("handles count of 1", () => {
      const codes = generateCodeStrings(1);
      expect(codes.length).toBe(1);
      expect(codes[0]).toMatch(/^MG-JUDGE-/);
    });
  });
});