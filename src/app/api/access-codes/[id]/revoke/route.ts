/**
 * PATCH /api/access-codes/:id/revoke
 *
 * Revoke an access code. Admin only.
 */
import { NextRequest } from "next/server";

import { requireAdmin } from "@/lib/access-codes/admin-auth";
import { revokeCode } from "@/lib/access-codes";
import { errorResponse, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    if (!id) {
      throw new ValidationError("id", "缺少访问码 ID");
    }

    const code = await revokeCode(id);
    if (!code) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: "访问码不存在" } },
        { status: 404 },
      );
    }

    logger.info("access_codes.revoke.ok", { id });
    return Response.json({ code });
  } catch (error) {
    logger.error("access_codes.revoke.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}