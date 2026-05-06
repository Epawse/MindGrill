/**
 * POST /api/subscription/upgrade
 *
 * Upgrade a user's subscription plan. Admin only.
 * Body: { userId: string, planId: PlanId }
 *
 * For simulated payment: this is the endpoint that "confirms" a purchase.
 * In production, this would be called by a webhook after payment confirmation.
 */
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin-auth";
import { upgradePlan, type PlanId } from "@/lib/subscription";
import { errorResponse, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const UpgradeSchema = z.object({
  userId: z.string().uuid(),
  planId: z.enum(["free", "plus", "pro"]),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const json = await req.json().catch(() => null);
    const parsed = UpgradeSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        "body",
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
    }

    const { userId, planId } = parsed.data;
    const subscription = await upgradePlan(userId, planId as PlanId);

    if (!subscription) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "用户订阅信息未找到" } },
        { status: 404 },
      );
    }

    logger.info("subscription.upgrade.ok", { userId, planId });
    return Response.json({ subscription });
  } catch (error) {
    logger.error("subscription.upgrade.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}