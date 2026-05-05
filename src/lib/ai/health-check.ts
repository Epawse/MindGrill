/**
 * Server-side health check: reports which providers have a key configured.
 * Safe to call from a Route Handler (reads `process.env`).
 *
 * Note: we never return the API key value itself — only whether it's set.
 */
import {
  PROVIDERS,
  type ProviderId,
  type ProviderMeta,
} from "./provider-registry";
import { parseApiKeys } from "./key-rotation";

export interface ProviderHealth {
  id: ProviderId;
  displayName: string;
  configured: boolean;
  missingEnv: string[];
  recommendedModels: string[];
  blurb: string;
  /** Number of API keys parsed from the env var (1 for single key, N for comma-separated). */
  keyCount: number;
}

function checkOne(meta: ProviderMeta): ProviderHealth {
  const missing: string[] = [];
  const rawKey = process.env[meta.envKey];
  const keys = parseApiKeys(rawKey);
  if (keys.length === 0) missing.push(meta.envKey);
  if (meta.requiresBaseUrl) {
    const explicit = meta.baseUrlEnvKey
      ? process.env[meta.baseUrlEnvKey]
      : undefined;
    const has = (explicit && explicit.length > 0) || meta.defaultBaseUrl;
    if (!has && meta.baseUrlEnvKey) missing.push(meta.baseUrlEnvKey);
  }
  return {
    id: meta.id,
    displayName: meta.displayName,
    configured: missing.length === 0,
    missingEnv: missing,
    recommendedModels: meta.recommendedModels,
    blurb: meta.blurb,
    keyCount: keys.length,
  };
}

export function getProviderHealth(): ProviderHealth[] {
  return PROVIDERS.map(checkOne);
}

export function getConfiguredProviders(): ProviderId[] {
  return getProviderHealth()
    .filter((p) => p.configured)
    .map((p) => p.id);
}
