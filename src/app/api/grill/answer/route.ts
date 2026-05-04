/**
 * POST /api/grill/answer
 *
 * Body: { session, answer, providerId? }
 * Returns either:
 *   { session, question }                — engine still GRILLING, next question attached
 *   { session, complete: true, revisedDraft } — engine reached COMPLETE; revision attached
 */
import { NextRequest } from "next/server";
import { generateObject } from "ai";

import {
  AnswerInputSchema,
  GrillQuestionSchema,
  RevisionSchema,
  EnginePhase,
} from "@/lib/schemas/grill";
import {
  applyAnswer,
  attachQuestion,
  completeSession,
} from "@/lib/engine";
import {
  buildScenarioPrompt,
  buildRevisionPrompt,
} from "@/lib/engine/scenarios";
import {
  getFallbackOrder,
  resolveProvider,
  withFallback,
} from "@/lib/ai";
import {
  errorResponse,
  ProviderUnavailableError,
  ValidationError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { upsertSession } from "@/lib/supabase/sessions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  try {
    const json = await req.json().catch(() => null);
    const parsed = AnswerInputSchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        "body",
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
    }
    const { answer } = parsed.data;
    const providerOverride = parsed.data.providerId;
    const providerId = resolveProvider(providerOverride);
    if (!providerId) {
      throw new ProviderUnavailableError(
        "未配置任何 LLM 提供商。请在 .env.local 至少设置一个 *_API_KEY。",
      );
    }

    let session = applyAnswer(parsed.data.session, answer);
    const model = withFallback(
      providerId,
      undefined,
      getFallbackOrder(providerId),
    );

    // If the engine reached THINKING after applying the answer, generate
    // the final revision and complete the session.
    if (session.phase === EnginePhase.THINKING) {
      return await finalizeSession(session, model, startedAt);
    }

    // Otherwise: still grilling — generate the next question.
    const prompt = buildScenarioPrompt(session.scenario, { session });
    const result = await generateObject({
      model,
      schema: GrillQuestionSchema,
      system: prompt.systemPrompt,
      prompt: prompt.userPrompt,
      temperature: 0.4,
    });
    session = attachQuestion(session, result.object);

    // The LLM may have asked us to skip — keep generating until we have an
    // ACTIVE node with an attached question, or the engine moves to THINKING.
    let safety = 0;
    while (
      session.phase === EnginePhase.GRILLING &&
      safety < 3 &&
      currentNodeNeedsQuestion(session)
    ) {
      const p = buildScenarioPrompt(session.scenario, { session });
      const r = await generateObject({
        model,
        schema: GrillQuestionSchema,
        system: p.systemPrompt,
        prompt: p.userPrompt,
        temperature: 0.4,
      });
      session = attachQuestion(session, r.object);
      safety += 1;
    }

    // Auto-skipped nodes may have pushed us into THINKING.
    if (session.phase === EnginePhase.THINKING) {
      return await finalizeSession(session, model, startedAt);
    }

    logger.info("grill.answer.next", {
      sessionId: session.id,
      latencyMs: Date.now() - startedAt,
    });
    void upsertSession({ session }).catch((e) =>
      logger.warn("grill.persist.mid.failed", { e: String(e) }),
    );
    return Response.json({ session, question: result.object });
  } catch (error) {
    logger.error("grill.answer.error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(error);
  }
}

/**
 * Generate the final revision, complete the session, and return the
 * completion response. Extracted to avoid duplicating the completion
 * block for the two code paths that can trigger THINKING phase.
 */
async function finalizeSession(
  session: GrillSessionFromEngine,
  model: ReturnType<typeof withFallback>,
  startedAt: number,
): Promise<Response> {
  const prompt = buildRevisionPrompt({ session });
  const result = await generateObject({
    model,
    schema: RevisionSchema,
    system: prompt.systemPrompt,
    prompt: prompt.userPrompt,
    temperature: 0.5,
  });
  session = completeSession(session, result.object);
  logger.info("grill.answer.complete", {
    sessionId: session.id,
    latencyMs: Date.now() - startedAt,
  });
  // Best-effort persistence — anonymous + unconfigured Supabase paths no-op.
  void upsertSession({
    session,
    revision: result.object,
    revisedDraft: result.object.revised_draft,
  }).catch((e) => logger.warn("grill.persist.complete.failed", { e: String(e) }));
  return Response.json({
    session,
    complete: true,
    revisedDraft: result.object.revised_draft,
    revision: result.object,
  });
}

type GrillSessionFromEngine = ReturnType<typeof applyAnswer>;

function currentNodeNeedsQuestion(
  session: GrillSessionFromEngine,
): boolean {
  if (!session.activeNodeId) return false;
  const node = session.nodes[session.activeNodeId];
  return !!node && node.question === null;
}
