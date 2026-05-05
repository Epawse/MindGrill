/**
 * POST /api/access-codes/create
 *
 * Batch-generate access codes. Admin only.
 *
 * Body: { count: number, quotaTotal: number, expiresAt: string, note?: string }
 */
import { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/access-codes/admin-auth";
import { createCodes } from "@/lib/access-codes";
import { errorResponse, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const CreateSchema = z.object({
  count: z.number().int().min(1).max(200),
  quotaTotal: z.number().int().min(1).max(1000).default(30),
  expiresAt: z.string().datetime(),
  note: z.string().max(200).optional(),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

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

    const codes = await createCodes(parsed.data);
    logger.info("access_codes.create.ok", {
      count: codes.length,
      quotaTotal: parsed.data.quotaTotal,
    });
    return Response.json({ codes });
  } catch (error) {
    logger.error("access_codes.create.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}