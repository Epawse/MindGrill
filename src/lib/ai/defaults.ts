/**
 * Default-provider selection.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_DEFAULT_PROVIDER` env var (if it points to a configured provider)
 *   2. The first healthy provider in our preference order
 *   3. `null` if nothing is configured (caller is expected to surface a UI hint)
 */
import { getConfiguredProviders } from "./health-check";
import { isProviderId, type ProviderId } from "./provider-registry";

const PREFERENCE_ORDER: ProviderId[] = [
  "deepseek",
  "google",
  "openai",
  "anthropic",
  "qwen",
  "glm",
  "hunyuan",
  "doubao",
];

export function getDefaultProvider(): ProviderId | null {
  const configured = new Set(getConfiguredProviders());
  const fromEnv = process.env.NEXT_PUBLIC_DEFAULT_PROVIDER;
  if (fromEnv && isProviderId(fromEnv) && configured.has(fromEnv)) {
    return fromEnv;
  }
  for (const id of PREFERENCE_ORDER) {
    if (configured.has(id)) return id;
  }
  // Last-resort: any configured provider (e.g. openai-compatible)
  const first = [...configured][0];
  return first ?? null;
}

/** Order remaining configured providers as fallback candidates. */
export function getFallbackOrder(primary: ProviderId): ProviderId[] {
  const configured = getConfiguredProviders();
  const ordered = PREFERENCE_ORDER.filter(
    (id) => id !== primary && configured.includes(id),
  );
  // Append any configured providers that weren't in the preference list.
  for (const id of configured) {
    if (id !== primary && !ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

/**
 * Resolve the effective provider id from an optional user override.
 * Returns `null` when no provider is configured at all.
 */
export function resolveProvider(override?: string): ProviderId | null {
  if (override && isProviderId(override)) return override;
  return getDefaultProvider();
}
