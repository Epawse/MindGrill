import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getModelWithUserKey } from "@/lib/ai/user-key";
import type { ProviderId } from "@/lib/ai/provider-registry";

describe("getModelWithUserKey", () => {
  // Providers that work with just an apiKey (have defaultBaseUrl or don't need one)
  const providersWithDefault: ProviderId[] = [
    "openai",
    "anthropic",
    "google",
    "deepseek",
    "qwen",
    "glm",
    "hunyuan",
    "doubao",
  ];

  beforeEach(() => {
    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "https://example.com/v1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a model for each provider with a default baseUrl", () => {
    for (const providerId of providersWithDefault) {
      const model = getModelWithUserKey(providerId, undefined, "test-api-key-12345");
      expect(model).toBeDefined();
      expect(typeof (model as unknown as { modelId: string }).modelId).toBe("string");
    }
  });

  it("creates a model for openai-compatible with explicit baseUrl", () => {
    const model = getModelWithUserKey(
      "openai-compatible",
      undefined,
      "test-key",
      "https://example.com/v1",
    );
    expect(model).toBeDefined();
  });

  it("creates a model with explicit model ID", () => {
    const model = getModelWithUserKey("openai", "gpt-4o", "test-key");
    expect(model).toBeDefined();
  });

  it("uses default model when modelId is undefined", () => {
    const model = getModelWithUserKey("openai", undefined, "test-key");
    expect(model).toBeDefined();
    expect((model as unknown as { modelId: string }).modelId).toContain("gpt-4o-mini");
  });

  it("accepts custom baseUrl for providers with a default", () => {
    const model = getModelWithUserKey(
      "deepseek",
      undefined,
      "test-key",
      "https://custom-api.deepseek.com",
    );
    expect(model).toBeDefined();
  });

  it("throws ProviderConfigError for openai-compatible without baseUrl", () => {
    vi.unstubAllEnvs();
    expect(() =>
      getModelWithUserKey("openai-compatible", undefined, "test-key"),
    ).toThrow();
  });

  it("throws for unknown provider", () => {
    expect(() =>
      getModelWithUserKey("nonexistent" as ProviderId, undefined, "test-key"),
    ).toThrow();
  });
});