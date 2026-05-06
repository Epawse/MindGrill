/**
 * GET /api/subscription/status
 *
 * Get the current user's subscription status, including plan details
 * and credit balance. Requires authentication.
 */
import { getServerUser } from "@/lib/auth/get-user";
import { getUserSubscription } from "@/lib/subscription";
import { errorResponse, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    const serverUser = await getServerUser();
    if (!serverUser) {
      throw new UnauthorizedError();
    }

    const subscription = await getUserSubscription(serverUser.user.id);
    if (!subscription) {
      return Response.json(
        { error: { code: "NO_SUBSCRIPTION", message: "未找到订阅信息" } },
        { status: 404 },
      );
    }

    // Calculate total remaining credits
    const isUnlimited = subscription.plan.monthly_credits === 0;
    const monthlyRemaining = isUnlimited
      ? -1
      : subscription.credits_remaining;
    const bonusRemaining = subscription.bonus_credits - subscription.bonus_credits_used;

    return Response.json({
      subscription: {
        plan_id: subscription.plan_id,
        plan_name: subscription.plan.name,
        status: subscription.status,
        monthly_credits: subscription.plan.monthly_credits,
        max_rounds: subscription.plan.max_rounds,
        model_access: subscription.plan.model_access,
        credits_remaining: monthlyRemaining,
        bonus_credits_remaining: bonusRemaining,
        is_unlimited: isUnlimited,
        current_period_end: subscription.current_period_end,
      },
    });
  } catch (error) {
    logger.error("subscription.status.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}