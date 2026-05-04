/**
 * Factory: turn a (providerId, modelId) pair into a Vercel AI SDK
 * `LanguageModel` instance.
 *
 * - Native SDKs are used for `openai`, `anthropic`, `google`.
 * - Every other provider is OpenAI-compatible and goes through
 *   `createOpenAI({ baseURL })` with provider-specific defaults.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

import {
  defaultModelFor,
  getProviderMeta,
  type ProviderId,
} from "./provider-registry";
import { ProviderConfigError } from "./errors";

function readEnv(key: string): string | undefined {
  // process.env in Next 16 is statically replaced; this fn keeps the call site dynamic
  // for tests that stub env vars.
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

function resolveBaseUrl(meta: ReturnType<typeof getProviderMeta>): string | undefined {
  if (meta.baseUrlEnvKey) {
    const fromEnv = readEnv(meta.baseUrlEnvKey);
    if (fromEnv) return fromEnv;
  }
  return meta.defaultBaseUrl;
}

/**
 * Resolve an env-validated, ready-to-use Vercel AI SDK `LanguageModel`.
 * Throws `ProviderConfigError` if the provider is not configured.
 */
export function getModel(
  providerId: ProviderId,
  modelId?: string,
): LanguageModel {
  const meta = getProviderMeta(providerId);
  const apiKey = readEnv(meta.envKey);
  const missing: string[] = [];
  if (!apiKey) missing.push(meta.envKey);
  if (meta.requiresBaseUrl && !resolveBaseUrl(meta)) {
    if (meta.baseUrlEnvKey) missing.push(meta.baseUrlEnvKey);
  }
  if (missing.length > 0) {
    throw new ProviderConfigError(providerId, missing);
  }

  const model = modelId ?? defaultModelFor(providerId);

  switch (providerId) {
    case "openai": {
      const provider = createOpenAI({ apiKey });
      return provider.chat(model);
    }
    case "anthropic": {
      const provider = createAnthropic({ apiKey });
      return provider(model);
    }
    case "google": {
      const provider = createGoogleGenerativeAI({ apiKey });
      return provider(model);
    }
    default: {
      // OpenAI-compatible endpoints (deepseek / qwen / glm / hunyuan / doubao /
      // ollama-cloud / openai-compatible). All use `createOpenAI({ baseURL })`.
      const baseURL = resolveBaseUrl(meta);
      const provider = createOpenAI({
        apiKey,
        baseURL,
      });
      return provider.chat(model);
    }
  }
}
