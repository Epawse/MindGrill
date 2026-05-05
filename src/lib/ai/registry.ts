/**
 * Provider registry built with Vercel AI SDK 5 `createProviderRegistry`.
 *
 * The registry is built lazily on first access (not at module import time),
 * so that tests can stub env vars before the registry is constructed.
 * Call `resetRegistry()` to force a rebuild (useful in tests).
 *
 * Multi-key rotation is handled by `key-rotation.ts`: when a provider has
 * comma-separated keys, we pick a non-blacklisted one at random.
 */
import { createProviderRegistry } from "ai";
import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI, type GoogleGenerativeAIProvider } from "@ai-sdk/google";

import {
  PROVIDERS,
  getProviderMeta,
  defaultModelFor,
  type ProviderId,
} from "./provider-registry";
import { parseApiKeys, selectKey } from "./key-rotation";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Helper: read env
// ---------------------------------------------------------------------------

function readEnv(key: string): string | undefined {
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

// ---------------------------------------------------------------------------
// Build the provider registry (lazily)
// ---------------------------------------------------------------------------

/** Union of all SDK provider types we create. */
type SdkProvider = OpenAIProvider | AnthropicProvider | GoogleGenerativeAIProvider;

/**
 * Create an SDK provider instance for the given provider, using a selected
 * API key from the key pool (multi-key rotation).
 * Returns null if the provider is not configured.
 */
function createSdkProvider(id: ProviderId): SdkProvider | null {
  const meta = getProviderMeta(id);
  const rawKey = readEnv(meta.envKey);
  if (!rawKey) return null;

  const keys = parseApiKeys(rawKey);
  const selectedKey = selectKey(keys);
  if (!selectedKey) {
    logger.warn("all keys blacklisted, skipping provider", { providerId: id });
    return null;
  }

  switch (id) {
    case "openai":
      return createOpenAI({ apiKey: selectedKey });
    case "anthropic":
      return createAnthropic({ apiKey: selectedKey });
    case "google":
      return createGoogleGenerativeAI({ apiKey: selectedKey });
    default: {
      // OpenAI-compatible: deepseek, qwen, glm, hunyuan, doubao, ollama-cloud, openai-compatible
      const baseURL = resolveBaseUrl(meta);
      if (!baseURL && meta.requiresBaseUrl) return null;
      return createOpenAI({ apiKey: selectedKey, baseURL });
    }
  }
}

/** Cached registry instance, built lazily on first access. */
let _registry: ReturnType<typeof createProviderRegistry> | null = null;

/**
 * Build the registry from current env vars.
 * Only includes providers that have API keys configured.
 */
function buildRegistry() {
  const entries: Record<string, SdkProvider> = {};

  for (const meta of PROVIDERS) {
    const sdk = createSdkProvider(meta.id);
    if (sdk) {
      entries[meta.id] = sdk;
      logger.info("provider registered", {
        providerId: meta.id,
        keyCount: parseApiKeys(readEnv(meta.envKey)!).length,
      });
    }
  }

  return createProviderRegistry(entries);
}

/**
 * The AI SDK 5 provider registry.
 * Built lazily on first access and then cached.
 * Use: `getRegistry().languageModel('ollama-cloud:qwen3:235b')`
 *
 * Call `resetRegistry()` to force a rebuild (useful in tests after changing env).
 */
export function getRegistry() {
  if (!_registry) {
    _registry = buildRegistry();
  }
  return _registry;
}

/**
 * Reset the cached registry, forcing a rebuild on next access.
 * Primarily useful for tests that need to change env vars between assertions.
 */
export function resetRegistry(): void {
  _registry = null;
}

/**
 * Convenience wrapper: get a LanguageModel from the registry by provider ID
 * and optional model ID.
 *
 * Uses `registry.languageModel('providerId:modelId')` under the hood.
 * If modelId is omitted, uses the provider's default recommended model.
 *
 * Throws if the provider is not registered (no API key configured).
 */
export function getRegistryModel(
  providerId: ProviderId,
  modelId?: string,
) {
  const model = modelId ?? defaultModelFor(providerId);
  const registryId = `${providerId}:${model}` as `${string}:${string}`;
  return getRegistry().languageModel(registryId);
}