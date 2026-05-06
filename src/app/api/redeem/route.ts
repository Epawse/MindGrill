/**
 * POST /api/redeem
 *
 * Redeem a code to add bonus credits to the user's account.
 * Requires authentication. Anti-abuse: each user can only use a code once,
 * and each code has a max_uses limit.
 *
 * Body: { code: string }
 */
import { NextRequest } from "next/server";
import { z } from "zod";

import { getServerUser } from "@/lib/auth/get-user";
import { redeemCode } from "@/lib/redeem";
import { errorResponse, ValidationError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const RedeemSchema = z.object({
  code: z.string().min(1, "请输入兑换码"),
});

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "兑换码无效，请检查后重试",
  expired: "兑换码已过期",
  revoked: "兑换码已被吊销",
  fully_used: "兑换码已被全部使用",
  already_redeemed: "你已使用过此兑换码",
};

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const serverUser = await getServerUser();
    if (!serverUser) {
      throw new UnauthorizedError();
    }

    const json = await req.json().catch(() => null);
    const parsed = RedeemSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        "code",
        parsed.error.issues.map((i) => i.message).join("; "),
      );
    }

    const rawCode = parsed.data.code;
    const result = await redeemCode(rawCode, serverUser.user.id);

    if (!result.success) {
      const reason = result.reason ?? "not_found";
      const message = ERROR_MESSAGES[reason] ?? "兑换码无效";
      logger.info("redeem.failed", {
        code: rawCode.toUpperCase().trim(),
        reason,
        userId: serverUser.user.id,
      });
      return Response.json(
        { error: { code: "REDEEM_FAILED", message } },
        { status: 400 },
      );
    }

    logger.info("redeem.ok", {
      code: rawCode.toUpperCase().trim(),
      credits_granted: result.credits_granted,
      userId: serverUser.user.id,
    });

    return Response.json({
      success: true,
      credits_granted: result.credits_granted,
      bonus_remaining: result.bonus_remaining,
    });
  } catch (error) {
    logger.error("redeem.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}