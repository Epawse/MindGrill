/**
 * Sequential fallback router.
 *
 * `withFallback` wraps a primary `LanguageModel` with `wrapLanguageModel` +
 * a custom middleware. If the primary's `doGenerate` / `doStream` call
 * fails with a retryable error (rate-limit, network, 5xx), the middleware
 * sequentially tries each fallback model in order and returns the first
 * successful result.
 *
 * Keep it simple — no exponential backoff, no parallel races. MVP only.
 */
import {
  wrapLanguageModel,
  type LanguageModel,
  type LanguageModelMiddleware,
} from "ai";

import { getModel } from "./factory";
import { defaultModelFor, type ProviderId } from "./provider-registry";
import { ProviderConfigError, AllProvidersFailedError } from "./errors";
import { logger } from "@/lib/logger";

/**
 * Narrow shape of the V2 language model object that we need to talk to from
 * inside middleware. We only call `doGenerate` / `doStream`.
 */
interface LanguageModelV2Like {
  doGenerate: (params: unknown) => Promise<unknown>;
  doStream: (params: unknown) => Promise<unknown>;
}

interface FallbackTarget {
  id: ProviderId;
  model: LanguageModelV2Like;
}

function isRetryable(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  // Vercel AI SDK retry / API call errors expose .name + .statusCode
  const e = err as {
    name?: string;
    statusCode?: number;
    status?: number;
    code?: string;
    message?: string;
  };
  if (e.name === "AI_RetryError") return true;
  if (e.name === "APICallError") return true;
  const status = e.statusCode ?? e.status;
  if (typeof status === "number") {
    if (status === 429 || status === 408) return true;
    if (status >= 500) return true;
  }
  if (e.code === "ECONNRESET" || e.code === "ETIMEDOUT") return true;
  if (typeof e.message === "string" && /timeout|fetch failed|network/i.test(e.message)) {
    return true;
  }
  return false;
}

function buildFallbacks(
  fallbackIds: ProviderId[],
  modelId?: string,
): FallbackTarget[] {
  const out: FallbackTarget[] = [];
  for (const id of fallbackIds) {
    try {
      out.push({
        id,
        model: getModel(
          id,
          modelId ?? defaultModelFor(id),
        ) as unknown as LanguageModelV2Like,
      });
    } catch (err) {
      if (err instanceof ProviderConfigError) {
        logger.debug("fallback skipped (not configured)", { providerId: id });
        continue;
      }
      throw err;
    }
  }
  return out;
}

/**
 * Build a `LanguageModel` that tries `primaryId` first and falls back through
 * `fallbackIds` on retryable errors.
 *
 * If only the primary is available, returns it bare (no middleware).
 */
export function withFallback(
  primaryId: ProviderId,
  modelId: string | undefined,
  fallbackIds: ProviderId[],
): LanguageModel {
  const primary = getModel(primaryId, modelId);
  const fallbacks = buildFallbacks(fallbackIds, modelId);
  if (fallbacks.length === 0) return primary;

  const middleware: LanguageModelMiddleware = {
    middlewareVersion: "v2",
    wrapGenerate: async ({ doGenerate, params }) => {
      const attempts: Array<{ providerId: string; error: string }> = [];
      try {
        return await doGenerate();
      } catch (err) {
        attempts.push({
          providerId: primaryId,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!isRetryable(err)) throw err;
        logger.warn("primary provider failed, trying fallbacks", {
          providerId: primaryId,
          fallbacks: fallbacks.map((f) => f.id),
          error: err instanceof Error ? err.message : String(err),
        });
      }
      for (const fb of fallbacks) {
        try {
          return (await fb.model.doGenerate(params)) as Awaited<
            ReturnType<typeof doGenerate>
          >;
        } catch (err) {
          attempts.push({
            providerId: fb.id,
            error: err instanceof Error ? err.message : String(err),
          });
          if (!isRetryable(err)) throw err;
          logger.warn("fallback provider failed, advancing", {
            providerId: fb.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      throw new AllProvidersFailedError(attempts);
    },
    wrapStream: async ({ doStream, params }) => {
      const attempts: Array<{ providerId: string; error: string }> = [];
      try {
        return await doStream();
      } catch (err) {
        attempts.push({
          providerId: primaryId,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!isRetryable(err)) throw err;
      }
      for (const fb of fallbacks) {
        try {
          return (await fb.model.doStream(params)) as Awaited<
            ReturnType<typeof doStream>
          >;
        } catch (err) {
          attempts.push({
            providerId: fb.id,
            error: err instanceof Error ? err.message : String(err),
          });
          if (!isRetryable(err)) throw err;
        }
      }
      throw new AllProvidersFailedError(attempts);
    },
  };

  return wrapLanguageModel({
    // `getModel` always returns the V2 object form (never the bare string id),
    // but `LanguageModel` is the union `string | LanguageModelV2`. Cast through
    // `Parameters<typeof wrapLanguageModel>[0]["model"]` to keep us honest.
    model: primary as Parameters<typeof wrapLanguageModel>[0]["model"],
    middleware,
    providerId: primaryId,
    modelId: modelId ?? defaultModelFor(primaryId),
  });
}
