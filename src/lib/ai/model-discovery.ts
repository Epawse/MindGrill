/**
 * Best-effort model discovery via provider HTTP endpoints.
 *
 * Per D1.5: Model discovery is best-effort. If a provider doesn't support
 * /models or the request fails for any reason, return an empty array (not an error).
 *
 * This is a shared utility used by both the test-connection and models API routes.
 */
import type { ProviderId } from "./provider-registry";

/**
 * Discover available models for a provider by calling its /models HTTP endpoint.
 * Per D1.5: returns empty array on any failure, never throws.
 */
export async function discoverModelsHttp(
  providerId: ProviderId,
  apiKey: string,
  baseUrl?: string,
): Promise<string[]> {
  try {
    switch (providerId) {
      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return [];
        const json = await res.json();
        if (Array.isArray(json.data)) {
          return json.data
            .map((m: { id: string }) => m.id)
            .sort()
            .slice(0, 50);
        }
        return [];
      }
      case "anthropic":
        // Anthropic doesn't expose /models
        return [];
      case "google": {
        // Google AI Studio models list
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const res = await fetch(url, {
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return [];
        const json = await res.json();
        if (Array.isArray(json.models)) {
          return json.models
            .map((m: { name: string }) => m.name.replace("models/", ""))
            .sort()
            .slice(0, 50);
        }
        return [];
      }
      default: {
        // OpenAI-compatible providers
        if (!baseUrl) return [];
        const url = `${baseUrl.replace(/\/$/, "")}/models`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) return [];
        const json = await res.json();
        if (Array.isArray(json.data)) {
          return json.data
            .map((m: { id: string }) => m.id)
            .sort()
            .slice(0, 50);
        }
        return [];
      }
    }
  } catch {
    // Best-effort (D1.5): network errors, timeouts, parsing failures
    return [];
  }
}