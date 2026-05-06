/**
 * POST /api/grill/start
 *
 * Body: { scenario: ScenarioId, draft: string, providerId?: ProviderId }
 * Returns: { session: GrillSession, question: GrillQuestion }
 *
 * Creates a new grill session, attaches the first AI-generated question.
 */
import { NextRequest } from "next/server";
import { generateObject } from "ai";

import {
  GrillQuestionSchema,
  StartInputSchema,
} from "@/lib/schemas/grill";
import {
  attachQuestion,
  createSession,
} from "@/lib/engine";
import { buildScenarioPrompt } from "@/lib/engine/scenarios";
import {
  getFallbackOrder,
  resolveProvider,
  withFallback,
} from "@/lib/ai";
import { providerOptionsFor } from "@/lib/ai/provider-registry";
import { getModelWithUserKey, getUserProviderKey } from "@/lib/ai/user-key";
import { getServerUser } from "@/lib/auth/get-user";
import { errorResponse, ValidationError, ProviderUnavailableError, UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { upsertSession } from "@/lib/supabase/sessions";
import { deductCredit } from "@/lib/subscription";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const json = await req.json().catch(() => null);
    const parsed = StartInputSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        "body",
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
    }
    const { scenario, draft } = parsed.data;
    const providerOverride = parsed.data.providerId;
    const providerId = resolveProvider(providerOverride);
    if (!providerId) {
      throw new ProviderUnavailableError(
        "未配置任何 LLM 提供商。请在 .env.local 至少设置一个 *_API_KEY。",
      );
    }

    let session = createSession(scenario, draft);
    const prompt = buildScenarioPrompt(scenario, { session });

    // Require authentication — no anonymous access.
    const serverUser = await getServerUser();
    if (!serverUser) {
      throw new UnauthorizedError("请登录后继续");
    }

    // User key priority: if the user has their own API key for this provider,
    // use it directly. Users with their own key don't consume platform credits.
    const userKey = await getUserProviderKey(serverUser.user.id, providerId);

    // Deduct platform credit if user is NOT using their own key.
    // PRO plan (unlimited) and users with own keys bypass credit deduction.
    if (!userKey) {
      const creditResult = await deductCredit(serverUser.user.id);
      if (!creditResult.allowed) {
        const messages: Record<string, string> = {
          no_subscription: "未找到订阅信息，请先登录",
          no_plan: "套餐信息异常",
          no_credits: "额度已用完，请升级套餐或配置自己的 API Key",
        };
        return Response.json(
          {
            error: {
              code: "QUOTA_EXCEEDED",
              message: messages[creditResult.reason ?? "no_credits"] ?? "额度不足",
            },
          },
          { status: 403 },
        );
      }
    }

    const model = userKey
      ? getModelWithUserKey(providerId, undefined, userKey)
      : withFallback(
          providerId,
          undefined,
          getFallbackOrder(providerId),
        );

    logger.info("grill.start", {
      sessionId: session.id,
      scenario,
      providerId,
      draftLength: draft.length,
      userKeyUsed: !!userKey,
    });

    const result = await generateObject({
      model,
      schema: GrillQuestionSchema,
      system: prompt.systemPrompt,
      prompt: prompt.userPrompt,
      temperature: 0.4,
      providerOptions: providerOptionsFor(providerId),
    });

    session = attachQuestion(session, result.object);
    logger.info("grill.start.ok", {
      sessionId: session.id,
      latencyMs: Date.now() - startedAt,
    });
    void upsertSession({ session }).catch((e) =>
      logger.warn("grill.persist.start.failed", { e: String(e) }),
    );
    return Response.json({ session, question: result.object });
  } catch (error) {
    logger.error("grill.start.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}
