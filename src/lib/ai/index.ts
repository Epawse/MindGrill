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
