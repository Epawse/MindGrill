/**
 * Access code validation and quota management.
 *
 * Access codes serve as both gate and quota. Server-side deduction means
 * clearing cookies does NOT reset quota — the DB is the source of truth.
 *
 * RLS on the access_codes table means anonymous clients cannot directly
 * query/modify codes. All public operations go through SECURITY DEFINER
 * RPC functions that bypass RLS safely.
 */
import { getServerSupabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccessCodeRow {
  id: string;
  code: string;
  quota_total: number;
  quota_used: number;
  expires_at: string;
  note: string | null;
  revoked: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface ValidateResult {
  valid: boolean;
  reason?: "not_found" | "expired" | "revoked" | "quota_exhausted";
  codeRow?: AccessCodeRow;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: "not_found" | "expired" | "revoked" | "quota_exhausted";
  remaining?: number;
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

/**
 * Generate a single access code string: MG-JUDGE-<12 random chars>.
 *
 * Uses crypto.getRandomValues for cryptographic randomness.
 */
export function generateCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I1O0 to avoid confusion
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
  return `MG-JUDGE-${suffix}`;
}

/**
 * Batch-generate unique code strings.
 */
export function generateCodeStrings(count: number): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  while (codes.length < count) {
    const code = generateCodeString();
    if (!seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  }
  return codes;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate an access code against the database.
 *
 * Uses the `validate_access_code` SECURITY DEFINER function to bypass RLS.
 * Returns { valid: true, codeRow } on success, or { valid: false, reason } on failure.
 */
export async function validateCode(code: string): Promise<ValidateResult> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    logger.error("access_codes.validate.no_supabase", { code });
    return { valid: false, reason: "not_found" };
  }

  // Normalize: codes are uppercase MG-JUDGE-<chars>.
  const normalizedCode = code.toUpperCase().trim();

  const { data, error } = await supabase.rpc("validate_access_code", {
    p_code: normalizedCode,
  });

  if (error) {
    logger.error("access_codes.validate.rpc_error", {
      error: error.message,
      code: normalizedCode,
    });
    return { valid: false, reason: "not_found" };
  }

  if (!data) {
    return { valid: false, reason: "not_found" };
  }

  // data is { valid: boolean, reason?: string, codeRow?: object }
  if (!data.valid) {
    return {
      valid: false,
      reason: data.reason ?? "not_found",
      ...(data.codeRow ? { codeRow: data.codeRow as AccessCodeRow } : {}),
    };
  }

  return { valid: true, codeRow: data.codeRow as AccessCodeRow };
}

// ---------------------------------------------------------------------------
// Quota deduction
// ---------------------------------------------------------------------------

/**
 * Check if an access code has remaining quota, and deduct one unit if so.
 *
 * Uses the `deduct_access_code_quota` SECURITY DEFINER function which
 * performs an atomic UPDATE ... WHERE ... RETURNING — no race condition
 * between concurrent requests.
 *
 * This is meant to be called from grill API routes (/api/grill/start and /api/grill/answer).
 * Returns { allowed: true } after successful deduction, or { allowed: false, reason } if blocked.
 */
export async function checkAndDeductQuota(code: string): Promise<QuotaCheckResult> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    logger.error("access_codes.quota.no_supabase", { code });
    return { allowed: false, reason: "not_found" };
  }

  // Normalize: codes are uppercase MG-JUDGE-<chars>.
  const normalizedCode = code.toUpperCase().trim();

  const { data, error } = await supabase.rpc("deduct_access_code_quota", {
    p_code: normalizedCode,
  });

  if (error) {
    logger.error("access_codes.quota.rpc_error", {
      error: error.message,
      code: normalizedCode,
    });
    return { allowed: false, reason: "not_found" };
  }

  if (!data) {
    return { allowed: false, reason: "not_found" };
  }

  // data is { allowed: boolean, reason?: string, remaining?: number }
  if (!data.allowed) {
    return { allowed: false, reason: data.reason ?? "not_found" };
  }

  return { allowed: true, remaining: data.remaining as number };
}

// ---------------------------------------------------------------------------
// Admin operations
// ---------------------------------------------------------------------------

/**
 * Batch-create access codes. Returns the created rows.
 */
export async function createCodes(params: {
  count: number;
  quotaTotal: number;
  expiresAt: string;
  note?: string;
}): Promise<AccessCodeRow[]> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const codes = generateCodeStrings(params.count);
  const rows = codes.map((code) => ({
    code,
    quota_total: params.quotaTotal,
    quota_used: 0,
    expires_at: params.expiresAt,
    note: params.note ?? null,
    revoked: false,
  }));

  const { data, error } = await supabase
    .from("access_codes")
    .insert(rows)
    .select();

  if (error) {
    logger.error("access_codes.create.error", { error: error.message });
    throw error;
  }

  return (data ?? []) as AccessCodeRow[];
}

/**
 * List all access codes, ordered by creation date descending.
 */
export async function listCodes(): Promise<AccessCodeRow[]> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase
    .from("access_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("access_codes.list.error", { error: error.message });
    throw error;
  }

  return (data ?? []) as AccessCodeRow[];
}

/**
 * Revoke an access code by ID.
 */
export async function revokeCode(id: string): Promise<AccessCodeRow | null> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    throw new Error("Supabase not configured");
  }

  const { data, error } = await supabase
    .from("access_codes")
    .update({ revoked: true })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    logger.error("access_codes.revoke.error", { error: error.message, id });
    throw error;
  }

  return data as AccessCodeRow | null;
}