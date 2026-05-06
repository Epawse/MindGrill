/**
 * GET /api/subscription/plans
 *
 * List all available subscription plans. Public endpoint.
 */
import { listPlans } from "@/lib/subscription";
import { errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    const plans = await listPlans();
    return Response.json({ plans });
  } catch (error) {
    logger.error("subscription.plans.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}