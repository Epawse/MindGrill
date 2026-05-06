/**
 * GET /api/admin/redeem-codes
 *
 * List all redemption codes. Admin only.
 */
import { requireAdmin } from "@/lib/auth/admin-auth";
import { listRedeemCodes } from "@/lib/redeem";
import { errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const codes = await listRedeemCodes();
    return Response.json({ codes });
  } catch (error) {
    logger.error("admin.redeem_codes.list.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}