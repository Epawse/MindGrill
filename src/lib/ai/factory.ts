/**
 * Factory: turn a (providerId, modelId) pair into a Vercel AI SDK
 * `LanguageModel` instance.
 *
 * Internally uses `createProviderRegistry` (AI SDK 5) for model resolution,
 * replacing the old switch/case approach. Multi-key rotation is handled
 * transparently by the key-rotation layer: when building provider instances
 * for the registry, a random non-blacklisted key is selected from the pool.
 *
 * Public API is unchanged: `getModel(providerId, modelId?)` still returns
 * a `LanguageModel` and throws `ProviderConfigError` for unconfigured providers.
 */
import type { LanguageModel } from "ai";

import {
  defaultModelFor,
  getProviderMeta,
  type ProviderId,
} from "./provider-registry";
import { ProviderConfigError } from "./errors";
import { parseApiKeys, selectKey, blacklistKey, shouldBlacklist, keyPrefix } from "./key-rotation";
import { getRegistryModel, resetRegistry } from "./registry";
import { logger } from "@/lib/logger";

function readEnv(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

/**
 * Resolve an env-validated, ready-to-use Vercel AI SDK `LanguageModel`.
 * Throws `ProviderConfigError` if the provider is not configured.
 *
 * Resolution strategy:
 * 1. Try the pre-built registry (fast path — keys already selected at build time)
 * 2. If registry doesn't have it (e.g. all keys were blacklisted at build time),
 *    reset the registry and retry — key rotation may have freed up a key since.
 */
export function getModel(
  providerId: ProviderId,
  modelId?: string,
): LanguageModel {
  const meta = getProviderMeta(providerId);
  const apiKey = readEnv(meta.envKey);
  const missing: string[] = [];
  if (!apiKey) missing.push(meta.envKey);

  // For OpenAI-compatible providers that require a base URL
  if (meta.requiresBaseUrl) {
    const explicit = meta.baseUrlEnvKey ? readEnv(meta.baseUrlEnvKey) : undefined;
    const has = (explicit && explicit.length > 0) || meta.defaultBaseUrl;
    if (!has && meta.baseUrlEnvKey) missing.push(meta.baseUrlEnvKey);
  }

  if (missing.length > 0) {
    throw new ProviderConfigError(providerId, missing);
  }

  const model = modelId ?? defaultModelFor(providerId);

  // Attempt to resolve from the pre-built registry
  try {
    return getRegistryModel(providerId, model);
  } catch {
    // Registry might not have the provider (all keys were blacklisted at build time).
    // Reset and retry — key rotation blacklist may have expired since the last build.
  }

  // Fallback: reset registry and try again (rebuilds with fresh key selection)
  const keys = parseApiKeys(apiKey);
  if (selectKey(keys) === null) {
    throw new ProviderConfigError(providerId, [
      `${meta.envKey} (all keys blacklisted)`,
    ]);
  }

  logger.info("resetting registry to rebuild with fresh key", { providerId });
  resetRegistry();

  try {
    return getRegistryModel(providerId, model);
  } catch {
    throw new ProviderConfigError(providerId, [
      `${meta.envKey} (failed to create provider after registry reset)`,
    ]);
  }
}

/**
 * After a failed API call, report the error and blacklist the key if
 * the error is retryable (401/429/503).
 *
 * Returns true if the key was blacklisted, false otherwise.
 */
export function reportKeyFailure(
  providerId: ProviderId,
  usedApiKey: string,
  error: unknown,
): boolean {
  if (shouldBlacklist(error)) {
    blacklistKey(usedApiKey);
    logger.warn("key blacklisted after failure", {
      providerId,
      keyPrefix: keyPrefix(usedApiKey),
    });
    return true;
  }
  return false;
}

/**
 * Parse and return the API keys configured for a given provider.
 * Useful for health checks and key count reporting.
 */
export function getProviderKeys(providerId: ProviderId): string[] {
  const meta = getProviderMeta(providerId);
  const raw = readEnv(meta.envKey);
  return parseApiKeys(raw);
}
