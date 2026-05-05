/**
 * Re-export the AI provider layer for ergonomic imports.
 *
 *   import { getModel, withFallback, getDefaultProvider } from "@/lib/ai";
 */
export {
  PROVIDERS,
  PROVIDER_IDS,
  defaultModelFor,
  getProviderMeta,
  isProviderId,
} from "./provider-registry";
export type { ProviderId, ProviderMeta } from "./provider-registry";
export { ProviderConfigError, AllProvidersFailedError } from "./errors";
export { getModel, reportKeyFailure, getProviderKeys } from "./factory";
export {
  getProviderHealth,
  getConfiguredProviders,
} from "./health-check";
export type { ProviderHealth } from "./health-check";
export { getDefaultProvider, getFallbackOrder, resolveProvider } from "./defaults";
export { withFallback } from "./router";
// Registry & key rotation
export { getRegistry, resetRegistry, getRegistryModel } from "./registry";
export {
  parseApiKeys,
  selectKey,
  blacklistKey,
  isBlacklisted,
  shouldBlacklist,
  availableKeyCount,
  clearBlacklist,
  blacklistSize,
  keyPrefix,
} from "./key-rotation";
// User key injection (per-user API keys, bypasses registry + blacklist)
// NOTE: getModelWithUserKey is server-only (uses SDK providers with API keys).
// getUserProviderKey is server-only (uses Supabase + decryption).
// Do NOT re-export encrypt/decrypt here — they use node:crypto and must
// never be imported from client-side code.
export { getModelWithUserKey, getUserProviderKey } from "./user-key";
