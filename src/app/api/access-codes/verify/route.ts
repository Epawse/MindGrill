/**
 * POST /api/access-codes/verify
 *
 * Validates an access code and sets the access_code cookie on success.
 * No auth required — this is the public entry point for code-based access.
 */
import { NextRequest } from "next/server";
import { z } from "zod";

import { validateCode } from "@/lib/access-codes";
import { errorResponse, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const VerifySchema = z.object({
  code: z.string().min(1, "请输入访问码"),
});

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "访问码无效，请检查后重试",
  expired: "访问码已过期",
  revoked: "访问码已被吊销",
  quota_exhausted: "访问码额度已用完",
};

export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = VerifySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        "code",
        parsed.error.issues.map((i) => i.message).join("; "),
      );
    }

    // Normalize: codes are uppercase MG-JUDGE-<chars>.
    // Always store and compare codes in uppercase so case-insensitive input works.
    const rawCode = parsed.data.code;
    const normalizedCode = rawCode.toUpperCase().trim();
    const result = await validateCode(normalizedCode);

    if (!result.valid) {
      const reason = result.reason ?? "not_found";
      const message = ERROR_MESSAGES[reason] ?? "访问码无效";
      logger.info("access_codes.verify.failed", { code: normalizedCode, reason });
      return Response.json(
        { error: { code: "ACCESS_CODE_INVALID", message } },
        { status: 403 },
      );
    }

    // Set the access_code cookie and return success.
    // Cookie value is always the normalized (uppercase) code.
    const response = Response.json({
      valid: true,
      remaining: result.codeRow
        ? result.codeRow.quota_total - result.codeRow.quota_used
        : 0,
    });

    response.headers.append(
      "Set-Cookie",
      `access_code=${encodeURIComponent(normalizedCode)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`,
    );

    logger.info("access_codes.verify.ok", { code: normalizedCode });
    return response;
  } catch (error) {
    logger.error("access_codes.verify.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}