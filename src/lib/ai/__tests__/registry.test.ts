import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import {
  PROVIDER_IDS,
  getProviderMeta,
  type ProviderId,
} from "@/lib/ai/provider-registry";
import { ProviderConfigError } from "@/lib/ai/errors";

// NOTE: The registry is built at module load time from env vars.
// We must stub env vars BEFORE importing the registry module,
// or accept that the initial build may have no providers.
// For these tests, we focus on getModel which re-resolves dynamically.

import { getModel, getProviderKeys } from "@/lib/ai/factory";
import { clearBlacklist } from "@/lib/ai/key-rotation";
import { resetRegistry } from "@/lib/ai/registry";

const ALL_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "OLLAMA_API_KEY",
  "DEEPSEEK_API_KEY",
  "QWEN_API_KEY",
  "GLM_API_KEY",
  "HUNYUAN_API_KEY",
  "DOUBAO_API_KEY",
  "OPENAI_COMPATIBLE_API_KEY",
];

beforeEach(() => {
  for (const key of ALL_KEYS) {
    vi.stubEnv(key, "");
  }
  vi.stubEnv("OLLAMA_BASE_URL", "");
  vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "");
  clearBlacklist();
  resetRegistry();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getModel with registry-based resolution", () => {
  const NATIVE_PROVIDERS: ProviderId[] = ["openai", "anthropic", "google"];
  const COMPAT_PROVIDERS: ProviderId[] = [
    "deepseek",
    "qwen",
    "glm",
    "hunyuan",
    "doubao",
    "ollama-cloud",
  ];

  for (const id of NATIVE_PROVIDERS) {
    it(`returns a model with non-empty modelId for ${id}`, () => {
      vi.stubEnv(getProviderMeta(id).envKey, "test-key-xxx");
      const model = getModel(id);
      const m = model as unknown as { modelId?: string };
      expect(typeof m.modelId).toBe("string");
      expect(m.modelId!.length).toBeGreaterThan(0);
    });
  }

  for (const id of COMPAT_PROVIDERS) {
    it(`returns a model with non-empty modelId for OpenAI-compatible ${id}`, () => {
      vi.stubEnv(getProviderMeta(id).envKey, "test-key-xxx");
      const model = getModel(id);
      const m = model as unknown as { modelId?: string };
      expect(typeof m.modelId).toBe("string");
      expect(m.modelId!.length).toBeGreaterThan(0);
    });
  }

  it("openai-compatible provider needs both API key + base URL", () => {
    vi.stubEnv("OPENAI_COMPATIBLE_API_KEY", "test-key");
    expect(() => getModel("openai-compatible")).toThrow(ProviderConfigError);
    vi.stubEnv("OPENAI_COMPATIBLE_BASE_URL", "https://example.com/v1");
    const model = getModel("openai-compatible");
    expect(model).toBeDefined();
  });
});

describe("getModel factory — missing config", () => {
  for (const id of PROVIDER_IDS) {
    it(`throws ProviderConfigError when ${getProviderMeta(id).envKey} is missing`, () => {
      // Already stubbed empty in beforeEach.
      expect(() => getModel(id)).toThrow(ProviderConfigError);
    });
  }
});

describe("getProviderKeys", () => {
  it("returns single key for single env var", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-abc");
    const keys = getProviderKeys("openai");
    expect(keys).toEqual(["sk-abc"]);
  });

  it("returns multiple keys for comma-separated env var", () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "key1,key2,key3");
    const keys = getProviderKeys("google");
    expect(keys).toEqual(["key1", "key2", "key3"]);
  });

  it("returns empty array when no key is set", () => {
    const keys = getProviderKeys("openai");
    expect(keys).toEqual([]);
  });
});

describe("provider registry", () => {
  it("exposes one ProviderMeta per id", () => {
    for (const id of PROVIDER_IDS) {
      const meta = getProviderMeta(id);
      expect(meta.id).toBe(id);
      expect(meta.recommendedModels.length).toBeGreaterThan(0);
      expect(meta.envKey).toMatch(/_API_KEY$/);
    }
  });
});