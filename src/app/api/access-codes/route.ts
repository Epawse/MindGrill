/**
 * GET /api/access-codes
 *
 * List all access codes with usage stats. Admin only.
 */
import { requireAdmin } from "@/lib/access-codes/admin-auth";
import { listCodes } from "@/lib/access-codes";
import { errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();

    const codes = await listCodes();
    return Response.json({ codes });
  } catch (error) {
    logger.error("access_codes.list.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}