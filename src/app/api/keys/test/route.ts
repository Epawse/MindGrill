/**
 * POST /api/keys/test
 *
 * Test a user-provided API key for connectivity.
 * Creates a temporary SDK provider instance and makes a minimal call.
 * Does NOT store the key.
 *
 * Per D1.5: Model discovery is best-effort. If provider doesn't support
 * /models, we return an empty list, not an error.
 *
 * Body: { providerId: string, apiKey: string, baseUrl?: string }
 * Response: { success: boolean, models?: string[], error?: string }
 */
import { NextRequest } from "next/server";
import { z } from "zod";

import { isProviderId, PROVIDER_IDS } from "@/lib/ai/provider-registry";
import { getModelWithUserKey } from "@/lib/ai/user-key";
import { discoverModelsHttp } from "@/lib/ai/model-discovery";
import { getServerUser } from "@/lib/auth/get-user";
import { UnauthorizedError, ValidationError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const TestKeySchema = z.object({
  providerId: z.string().refine(
    (v): v is typeof PROVIDER_IDS[number] => isProviderId(v),
    { message: "Invalid providerId" },
  ),
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      throw new UnauthorizedError("请登录后测试 API Key");
    }

    const json = await req.json().catch(() => null);
    const parsed = TestKeySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        "body",
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    }

    const { providerId, apiKey, baseUrl } = parsed.data;
    const cleanBaseUrl = baseUrl && baseUrl.trim() !== "" ? baseUrl.trim() : undefined;

    // Try to create a model instance and make a lightweight call to verify connectivity
    try {
      const model = getModelWithUserKey(providerId, undefined, apiKey, cleanBaseUrl);

      // Attempt a minimal generateText call to verify connectivity
      const { generateText } = await import("ai");
      await generateText({
        model,
        prompt: "Hi",
      });

      // Connectivity test passed — try model discovery (best-effort, D1.5)
      const models = await discoverModelsHttp(providerId, apiKey, cleanBaseUrl);

      logger.info("keys.test.ok", { providerId });

      return Response.json({
        success: true,
        models,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "连接失败，请检查 API Key";

      logger.warn("keys.test.failed", {
        providerId,
        error: message,
      });

      return Response.json({
        success: false,
        error: message,
        models: [],
      });
    }
  } catch (err) {
    logger.error("keys.test.error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err);
  }
}