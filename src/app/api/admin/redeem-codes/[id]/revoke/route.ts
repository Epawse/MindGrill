/**
 * PATCH /api/admin/redeem-codes/[id]/revoke
 *
 * Revoke a redemption code. Admin only.
 */
import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/auth/admin-auth";
import { revokeRedeemCode } from "@/lib/redeem";
import { errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const code = await revokeRedeemCode(id);

    if (!code) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "兑换码未找到" } },
        { status: 404 },
      );
    }

    logger.info("admin.redeem_codes.revoke.ok", { id });
    return Response.json({ code });
  } catch (error) {
    logger.error("admin.redeem_codes.revoke.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}