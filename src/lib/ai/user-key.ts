/**
 * User key injection — `getModelWithUserKey()`.
 *
 * Per D1.1: This is a standalone function, NOT modifying `getModel()`.
 * Creates a fresh SDK provider instance on-the-fly with the user's decrypted key.
 * User keys bypass the registry and blacklist entirely (D1.2).
 *
 * Usage in grill routes:
 *   const model = userKey
 *     ? getModelWithUserKey(providerId, modelId, userKey)
 *     : withFallback(providerId, modelId, getFallbackOrder(providerId));
 */
import type { LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import {
  getProviderMeta,
  defaultModelFor,
  type ProviderId,
} from "./provider-registry";
import { ProviderConfigError } from "./errors";

/**
 * Create a LanguageModel using the user's own API key.
 * This bypasses the registry, key rotation, and blacklist entirely (D1.2).
 *
 * @param providerId - The LLM provider (e.g. "openai", "anthropic")
 * @param modelId - Optional model override; defaults to provider's recommended model
 * @param userApiKey - The decrypted API key from the user's stored configuration
 * @param baseUrl - Optional base URL override (for OpenAI-compatible providers)
 */
export function getModelWithUserKey(
  providerId: ProviderId,
  modelId: string | undefined,
  userApiKey: string,
  baseUrl?: string,
): LanguageModel {
  const meta = getProviderMeta(providerId);
  const model = modelId ?? defaultModelFor(providerId);

  // Validate baseUrl for providers that require it
  if (meta.requiresBaseUrl && !baseUrl && !meta.defaultBaseUrl) {
    throw new ProviderConfigError(providerId, [
      `${meta.id} requires a base URL`,
    ]);
  }

  switch (providerId) {
    case "openai":
      return createOpenAI({ apiKey: userApiKey }).languageModel(model);
    case "anthropic":
      return createAnthropic({ apiKey: userApiKey }).languageModel(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey: userApiKey }).languageModel(model);
    default: {
      // All other providers are OpenAI-compatible
      const resolvedBaseUrl =
        baseUrl ?? meta.defaultBaseUrl ?? "";
      if (!resolvedBaseUrl) {
        throw new ProviderConfigError(providerId, [
          `No base URL configured for ${providerId}`,
        ]);
      }
      return createOpenAI({
        apiKey: userApiKey,
        baseURL: resolvedBaseUrl,
      }).languageModel(model);
    }
  }
}

/**
 * Fetch user's decrypted API key for a given provider from Supabase.
 * Returns the decrypted key string, or null if no key is configured.
 *
 * This function is server-only (uses Supabase server client + decryption).
 */
export async function getUserProviderKey(
  userId: string,
  providerId: ProviderId,
): Promise<string | null> {
  const { getServerSupabase } = await import("@/lib/supabase/server");
  const { decrypt } = await import("@/lib/ai/encryption");

  const supabase = await getServerSupabase();
  if (!supabase) return null;

  // Query the most recently created key for this user+provider pair
  const { data, error } = await supabase
    .from("user_provider_keys")
    .select("encrypted_key")
    .eq("user_id", userId)
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  try {
    return decrypt(data.encrypted_key);
  } catch {
    // Decryption failed — key may be corrupted or ENCRYPTION_KEY changed
    return null;
  }
}