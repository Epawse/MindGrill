import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  PROVIDERS,
  PROVIDER_IDS,
  defaultModelFor,
  getProviderMeta,
  isProviderId,
  type ProviderId,
} from "@/lib/ai/provider-registry";
import { getModel } from "@/lib/ai/factory";
import { ProviderConfigError } from "@/lib/ai/errors";
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
  resetRegistry();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("provider registry", () => {
  it("exposes one ProviderMeta per id", () => {
    for (const id of PROVIDER_IDS) {
      const meta = getProviderMeta(id);
      expect(meta.id).toBe(id);
      expect(meta.recommendedModels.length).toBeGreaterThan(0);
      expect(meta.envKey).toMatch(/_API_KEY$/);
    }
    expect(PROVIDERS).toHaveLength(PROVIDER_IDS.length);
  });

  it("isProviderId narrows correctly", () => {
    expect(isProviderId("openai")).toBe(true);
    expect(isProviderId("garbage")).toBe(false);
  });
});

describe("getModel factory — happy path with stubbed env", () => {
  const NATIVE_PROVIDERS: ProviderId[] = ["openai", "anthropic", "google"];
  const COMPAT_PROVIDERS: ProviderId[] = [
    "deepseek",
    "qwen",
    "glm",
    "hunyuan",
    "doubao",
  ];

  for (const id of NATIVE_PROVIDERS) {
    it(`returns a model with non-empty modelId for ${id}`, () => {
      vi.stubEnv(getProviderMeta(id).envKey, "test-key-xxx");
      const model = getModel(id);
      // LanguageModelV2 has a `modelId` property.
      const m = model as unknown as { modelId?: string };
      expect(typeof m.modelId).toBe("string");
      expect(m.modelId!.length).toBeGreaterThan(0);
      expect(m.modelId).toBe(defaultModelFor(id));
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
