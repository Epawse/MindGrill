/**
 * Multi-API Key Rotation.
 *
 * Same-provider key rotation inspired by AionUi:
 * - Parse comma-separated API keys from env var
 * - Random load balancing across non-blacklisted keys
 * - Failed keys (401/429/503) are blacklisted for a configurable duration (default 90s)
 * - After blacklist expires, key is automatically available again
 *
 * Blacklist is in-memory only (server-side Map). Process restart clears it.
 * Zero external dependencies.
 */

import { logger } from "@/lib/logger";

/** Default blacklist duration in milliseconds (90 seconds). */
const DEFAULT_BLACKLIST_DURATION_MS = 90_000;

/**
 * Read the blacklist duration from env, falling back to the default.
 * Env var: `KEY_BLACKLIST_DURATION_MS` (numeric string in ms).
 */
function getBlacklistDurationMs(): number {
  const raw = process.env.KEY_BLACKLIST_DURATION_MS;
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_BLACKLIST_DURATION_MS;
}

/**
 * In-memory blacklist: key prefix -> timestamp until which the key is blacklisted.
 * "Key prefix" = first 8 chars of the key (enough to identify uniquely in logs
 * without exposing the full key).
 */
const blacklist = new Map<string, number>();

/** Derive a short prefix for a key, for use as a blacklist map key and log output. */
export function keyPrefix(key: string): string {
  return key.slice(0, 8);
}

/**
 * Parse a comma-separated API key string into an array of trimmed keys.
 *
 * - `"sk-abc,sk-def,sk-ghi"` -> `["sk-abc", "sk-def", "sk-ghi"]`
 * - `"sk-single"` -> `["sk-single"]`
 * - `""` / `undefined` -> `[]`
 * - Keys with only whitespace are filtered out
 */
export function parseApiKeys(raw: string | undefined): string[] {
  if (!raw || raw.length === 0) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/**
 * Select a non-blacklisted key at random from the pool.
 * Returns `null` if all keys are blacklisted or the pool is empty.
 */
export function selectKey(keys: string[]): string | null {
  if (keys.length === 0) return null;

  const now = Date.now();
  const available = keys.filter((k) => {
    const until = blacklist.get(keyPrefix(k));
    return !until || now >= until;
  });

  if (available.length === 0) {
    logger.warn("all keys blacklisted for provider", {
      keyCount: keys.length,
    });
    return null;
  }

  // Random selection to distribute load
  const idx = Math.floor(Math.random() * available.length);
  return available[idx]!;
}

/**
 * Blacklist a key for the configured duration (default 90s).
 * Uses the key prefix to identify it in the blacklist map.
 */
export function blacklistKey(
  key: string,
  durationMs?: number,
): void {
  const prefix = keyPrefix(key);
  const duration = durationMs ?? getBlacklistDurationMs();
  const until = Date.now() + duration;
  blacklist.set(prefix, until);
  logger.warn("key blacklisted", {
    keyPrefix: prefix,
    durationMs: duration,
    blacklistUntil: until,
  });
}

/**
 * Check whether a key is currently blacklisted.
 */
export function isBlacklisted(key: string): boolean {
  const prefix = keyPrefix(key);
  const until = blacklist.get(prefix);
  if (!until) return false;
  if (Date.now() >= until) {
    blacklist.delete(prefix);
    return false;
  }
  return true;
}

/**
 * Determine whether an error is retryable and the used key should be blacklisted.
 * Matches 401 (auth failure), 429 (rate limit), 503 (service unavailable).
 *
 * Note: we do NOT blacklist on generic APICallError because that includes
 * non-retryable failures like 400 Bad Request. Only specific status codes
 * and AI_RetryError (which indicates exhausted retries) trigger blacklisting.
 */
export function shouldBlacklist(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    statusCode?: number;
    status?: number;
    name?: string;
    code?: string;
  };
  const status = e.statusCode ?? e.status;
  if (typeof status === "number") {
    return status === 401 || status === 429 || status === 503;
  }
  // AI SDK RetryError means all retries exhausted — blacklist the key
  if (e.name === "AI_RetryError") return true;
  return false;
}

/**
 * Get the count of keys that are currently not blacklisted.
 * Useful for health check reporting.
 */
export function availableKeyCount(keys: string[]): number {
  const now = Date.now();
  return keys.filter((k) => {
    const until = blacklist.get(keyPrefix(k));
    return !until || now >= until;
  }).length;
}

/**
 * Clear the entire blacklist. Useful for testing.
 */
export function clearBlacklist(): void {
  blacklist.clear();
}

/**
 * Get the total number of entries in the blacklist.
 * Useful for testing and health monitoring.
 */
export function blacklistSize(): number {
  // Clean up expired entries first
  const now = Date.now();
  for (const [prefix, until] of blacklist) {
    if (now >= until) blacklist.delete(prefix);
  }
  return blacklist.size;
}