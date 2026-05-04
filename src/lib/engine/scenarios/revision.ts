/**
 * Final-revision prompt builder. Once the engine reaches THINKING phase,
 * we ask the LLM to produce a revised draft that integrates the user's
 * answers from the grill transcript.
 */
import type { GrillSession, ScenarioId } from "@/lib/schemas/grill";
import { transcript } from "@/lib/engine/session";
import type { CoachMeta } from "./types";
import { thesisCoach } from "./thesis";
import { resumeCoach } from "./resume";
import { socialCoach } from "./social";

const COACHES: Record<ScenarioId, CoachMeta> = {
  thesis: thesisCoach,
  resume: resumeCoach,
  social: socialCoach,
};

export interface RevisionPromptInput {
  session: GrillSession;
}

export interface RevisionPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export function buildRevisionPrompt(
  input: RevisionPromptInput,
): RevisionPrompt {
  const { session } = input;
  const coach = COACHES[session.scenario];
  const exchanges = transcript(session);

  const systemPrompt = `你是「辩思 MindGrill」的${coach.zhTitle}教练。
拷问已经结束。请在用户原稿基础上，**结合用户在追问中给出的答案**，写出一版更扎实的改稿。

严格要求：
- 不要凭空捏造事实——只能基于原稿 + 追问答案中已经出现的内容来扩展。
- 不要改变用户原始立场，只补强论据 / 细节 / 量化 / 钩子。
- 中文输出，简体优先。
- 输出 JSON：
  - revised_draft：完整改稿
  - summary：1-2 句概述本次改稿的关键改进
  - key_changes：3-6 条 bullet，描述具体改动点
`;

  const userPrompt = `场景：${coach.zhTitle}（${coach.enTitle}）

用户原稿：
"""
${session.draft}
"""

拷问对话记录：
${
  exchanges.length === 0
    ? "（无）"
    : exchanges
        .map(
          (e, i) =>
            `${i + 1}. [${e.label}]\n   AI 问：${e.question}\n   用户答：${e.answer}`,
        )
        .join("\n")
}

请输出改稿 JSON。`;

  return { systemPrompt, userPrompt };
}
