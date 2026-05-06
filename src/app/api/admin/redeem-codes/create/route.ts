/**
 * POST /api/admin/redeem-codes/create
 *
 * Batch-generate redemption codes. Admin only.
 *
 * Body: { count: number, credits: number, maxUses: number, expiresAt: string, note?: string }
 */
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin-auth";
import { createRedeemCodes } from "@/lib/redeem";
import { errorResponse, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const CreateSchema = z.object({
  count: z.number().int().min(1).max(200),
  credits: z.number().int().min(1).max(10000),
  maxUses: z.number().int().min(1).max(10000).default(1),
  expiresAt: z.string().datetime(),
  note: z.string().max(200).optional(),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin();

    const json = await req.json().catch(() => null);
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        "body",
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
    }

    const codes = await createRedeemCodes({
      ...parsed.data,
      createdBy: adminUser.user.id,
    });

    logger.info("admin.redeem_codes.create.ok", {
      count: codes.length,
      credits: parsed.data.credits,
    });

    return Response.json({ codes });
  } catch (error) {
    logger.error("admin.redeem_codes.create.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}