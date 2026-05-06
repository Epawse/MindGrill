/**
 * GET /api/admin/subscriptions
 *
 * List all subscriptions with plan details. Admin only.
 */
import { requireAdmin } from "@/lib/auth/admin-auth";
import { listSubscriptions } from "@/lib/subscription";
import { errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const subscriptions = await listSubscriptions();
    return Response.json({ subscriptions });
  } catch (error) {
    logger.error("admin.subscriptions.list.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}