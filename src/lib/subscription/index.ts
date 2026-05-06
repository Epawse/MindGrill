/**
 * Subscription plan definitions and credit management.
 *
 * Plans are defined in the database (plans table) and seeded via migration.
 * The server-side functions handle credit deduction and monthly resets.
 *
 * User key priority: if a logged-in user has their own API key for the
 * selected provider, no platform credits are consumed.
 */
import { getServerSupabase } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const PlanId = {
  FREE: "free",
  PLUS: "plus",
  PRO: "pro",
} as const;
export type PlanId = (typeof PlanId)[keyof typeof PlanId];

export interface Plan {
  id: PlanId;
  name: string;
  monthly_credits: number; // 0 = unlimited
  max_rounds: number; // 0 = unlimited
  model_access: "basic" | "advanced" | "all";
  price_monthly: number; // in CNY cents
  price_yearly: number; // in CNY cents
  sort_order: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: PlanId;
  credits_remaining: number;
  credits_used: number;
  current_period_start: string | null;
  current_period_end: string | null;
  status: "active" | "past_due" | "canceled";
  bonus_credits: number;
  bonus_credits_used: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan;
}

export interface DeductResult {
  allowed: boolean;
  reason?: "no_subscription" | "no_plan" | "no_credits";
  remaining?: number; // -1 for unlimited plans
}

// ---------------------------------------------------------------------------
// Plan queries
// ---------------------------------------------------------------------------

/**
 * Get all plans, ordered by sort_order.
 */
export async function listPlans(): Promise<Plan[]> {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    logger.error("subscription.listPlans.error", { error: error.message });
    throw error;
  }

  return (data ?? []) as Plan[];
}

/**
 * Get a single plan by ID.
 */
export async function getPlan(planId: PlanId): Promise<Plan | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    logger.error("subscription.getPlan.error", { error: error.message });
    return null;
  }

  return data as Plan | null;
}

// ---------------------------------------------------------------------------
// Subscription queries
// ---------------------------------------------------------------------------

/**
 * Get the current user's subscription, joined with plan details.
 */
export async function getUserSubscription(
  userId: string,
): Promise<SubscriptionWithPlan | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("subscription.getUserSubscription.error", {
      error: error.message,
      userId,
    });
    return null;
  }

  if (!data) return null;

  // Flatten the join
  const { plan, ...sub } = data as Subscription & { plan: Plan };
  return { ...sub, plan } as SubscriptionWithPlan;
}

// ---------------------------------------------------------------------------
// Credit deduction
// ---------------------------------------------------------------------------

/**
 * Deduct one credit from a user's subscription.
 *
 * Uses the `deduct_subscription_credit` SECURITY DEFINER function for
 * atomic deduction. Monthly credits are consumed first, then bonus credits.
 * PRO plan (monthly_credits = 0) is always allowed with no deduction.
 *
 * Returns { allowed: true } on success, or { allowed: false, reason } on failure.
 */
export async function deductCredit(userId: string): Promise<DeductResult> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    logger.error("subscription.deductCredit.no_supabase", { userId });
    return { allowed: false, reason: "no_subscription" };
  }

  const { data, error } = await supabase.rpc("deduct_subscription_credit", {
    p_user_id: userId,
  });

  if (error) {
    logger.error("subscription.deductCredit.rpc_error", {
      error: error.message,
      userId,
    });
    return { allowed: false, reason: "no_subscription" };
  }

  if (!data) {
    return { allowed: false, reason: "no_subscription" };
  }

  if (!data.allowed) {
    return { allowed: false, reason: data.reason ?? "no_credits" };
  }

  return {
    allowed: true,
    remaining: data.remaining as number,
  };
}

// ---------------------------------------------------------------------------
// Monthly credit reset
// ---------------------------------------------------------------------------

/**
 * Reset a user's monthly credits. Called by admin or scheduled job.
 */
export async function resetMonthlyCredits(
  userId: string,
): Promise<{ success: boolean; credits_remaining?: number }> {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase.rpc("reset_monthly_credits", {
    p_user_id: userId,
  });

  if (error) {
    logger.error("subscription.resetMonthlyCredits.error", {
      error: error.message,
      userId,
    });
    throw error;
  }

  return data as { success: boolean; credits_remaining?: number };
}

// ---------------------------------------------------------------------------
// Plan upgrade (admin or simulated payment)
// ---------------------------------------------------------------------------

/**
 * Upgrade a user's plan and reset their credits.
 * Used by admin panel or simulated payment flow.
 */
export async function upgradePlan(
  userId: string,
  newPlanId: PlanId,
): Promise<Subscription | null> {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const plan = await getPlan(newPlanId);
  if (!plan) throw new Error(`Plan not found: ${newPlanId}`);

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      plan_id: newPlanId,
      credits_remaining: plan.monthly_credits,
      credits_used: 0,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error("subscription.upgradePlan.error", {
      error: error.message,
      userId,
      newPlanId,
    });
    throw error;
  }

  return data as Subscription | null;
}

// ---------------------------------------------------------------------------
// Admin: list all subscriptions
// ---------------------------------------------------------------------------

export async function listSubscriptions(): Promise<SubscriptionWithPlan[]> {
  const supabase = await getServerSupabase();
  if (!supabase) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, plan:plans(*)")
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("subscription.listSubscriptions.error", {
      error: error.message,
    });
    throw error;
  }

  return (data ?? []).map((row: Subscription & { plan: Plan }) => ({
    ...row,
    plan: row.plan,
  })) as SubscriptionWithPlan[];
}