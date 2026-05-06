/**
 * Redemption code management.
 *
 * Redeem codes are one-time codes that grant bonus credits to a user's account.
 * Each code can be used by multiple users (up to max_uses), but each user
 * can only use a code once. Anti-abuse protections:
 * - Unique constraint on (code_id, user_id) prevents double-redemption
 * - Atomic UPDATE ... WHERE used_count < max_uses prevents over-redemption
 * - Codes can be revoked or expire
 */
import { getServerSupabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RedeemCodeRow {
  id: string;
  code: string;
  credits: number;
  max_uses: number;
  used_count: number;
  expires_at: string;
  note: string | null;
  revoked: boolean;
  created_by: string | null;
  created_at: string;
}

export interface RedeemResult {
  success: boolean;
  reason?: "not_found" | "expired" | "revoked" | "fully_used" | "already_redeemed";
  credits_granted?: number;
  bonus_remaining?: number;
}

// ---------------------------------------------------------------------------
// Code generation
// ---------------------------------------------------------------------------

/**
 * Generate a single redemption code string: MG-REDEEM-<12 random chars>.
 */
export function generateRedeemCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
  return `MG-REDEEM-${suffix}`;
}

/**
 * Batch-generate unique code strings.
 */
export function generateRedeemCodeStrings(count: number): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  while (codes.length < count) {
    const code = generateRedeemCodeString();
    if (!seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  }
  return codes;
}

// ---------------------------------------------------------------------------
// Redeem (user-facing)
// ---------------------------------------------------------------------------

/**
 * Redeem a code for a user. Uses the `redeem_code` SECURITY DEFINER function
 * for atomic validation, usage tracking, and credit granting.
 *
 * Anti-abuse:
 * - Each user can only use a code once (unique constraint)
 * - Code has a max_uses limit (atomic increment prevents over-redemption)
 * - Codes can be revoked or expire
 */
export async function redeemCode(
  code: string,
  userId: string,
): Promise<RedeemResult> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    logger.error("redeem.redeemCode.no_supabase", { code, userId });
    return { success: false, reason: "not_found" };
  }

  const normalizedCode = code.toUpperCase().trim();

  const { data, error } = await supabase.rpc("redeem_code", {
    p_code: normalizedCode,
    p_user_id: userId,
  });

  if (error) {
    logger.error("redeem.redeemCode.rpc_error", {
      error: error.message,
      code: normalizedCode,
      userId,
    });
    return { success: false, reason: "not_found" };
  }

  if (!data) {
    return { success: false, reason: "not_found" };
  }

  if (!data.success) {
    return {
      success: false,
      reason: data.reason ?? "not_found",
    };
  }

  return {
    success: true,
    credits_granted: data.credits_granted,
    bonus_remaining: data.bonus_remaining,
  };
}

// ---------------------------------------------------------------------------
// Admin operations
// ---------------------------------------------------------------------------

/**
 * Batch-create redemption codes. Returns the created rows.
 */
export async function createRedeemCodes(params: {
  count: number;
  credits: number;
  maxUses: number;
  expiresAt: string;
  note?: string;
  createdBy?: string;
}): Promise<RedeemCodeRow[]> {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const codes = generateRedeemCodeStrings(params.count);
  const rows = codes.map((code) => ({
    code,
    credits: params.credits,
    max_uses: params.maxUses,
    used_count: 0,
    expires_at: params.expiresAt,
    note: params.note ?? null,
    revoked: false,
    created_by: params.createdBy ?? null,
  }));

  const { data, error } = await supabase
    .from("redeem_codes")
    .insert(rows)
    .select();

  if (error) {
    logger.error("redeem.createRedeemCodes.error", { error: error.message });
    throw error;
  }

  return (data ?? []) as RedeemCodeRow[];
}

/**
 * List all redemption codes, ordered by creation date descending.
 */
export async function listRedeemCodes(): Promise<RedeemCodeRow[]> {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("redeem_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("redeem.listRedeemCodes.error", { error: error.message });
    throw error;
  }

  return (data ?? []) as RedeemCodeRow[];
}

/**
 * Revoke a redemption code by ID.
 */
export async function revokeRedeemCode(
  id: string,
): Promise<RedeemCodeRow | null> {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("redeem_codes")
    .update({ revoked: true })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    logger.error("redeem.revokeRedeemCode.error", { error: error.message, id });
    throw error;
  }

  return data as RedeemCodeRow | null;
}