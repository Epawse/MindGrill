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

export interface ProviderHealth {
  id: ProviderId;
  displayName: string;
  configured: boolean;
  missingEnv: string[];
  recommendedModels: string[];
  blurb: string;
}

function checkOne(meta: ProviderMeta): ProviderHealth {
  const missing: string[] = [];
  const apiKey = process.env[meta.envKey];
  if (!apiKey || apiKey.length === 0) missing.push(meta.envKey);
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
