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
import { getModelWithUserKey, getUserProviderKey } from "@/lib/ai/user-key";
import { getServerUser } from "@/lib/auth/get-user";
import { errorResponse, ValidationError, ProviderUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { upsertSession } from "@/lib/supabase/sessions";

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

    // User key priority: if the user is logged in and has a key for this provider,
    // use it directly (bypasses env key + blacklist). Otherwise, fall back to env key.
    const serverUser = await getServerUser();
    const userKey = serverUser
      ? await getUserProviderKey(serverUser.user.id, providerId)
      : null;
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
