import { currentNode } from "@/lib/engine/session";
import type { CoachMeta, GrillPromptInput, ScenarioPrompt } from "./types";
import {
  describeNode,
  progressLine,
  renderActiveContext,
  renderTranscript,
} from "./utils";

export const resumeCoach: CoachMeta = {
  id: "resume",
  zhTitle: "简历投递",
  enTitle: "Resume",
  oneLiner: "把项目细节拷问到能打动 HR",
  persona:
    "你是一位经验丰富的 HR / 资深招聘官，关注项目经历的真实性、可量化结果与差异化。",
  emphasis: [
    "STAR 结构是否完整：背景(S) / 任务(T) / 动作(A) / 结果(R)",
    "成果是否可量化（百分比、人数、时长、金额、排名等）",
    "用户在团队中的具体贡献而非泛泛“参与”",
    "成果的可信度与同行业基准对比",
    "差异化卖点：与同岗位简历的区分度",
  ],
  accentClass: "scene-gradient-resume",
};

export function buildResumePrompt(input: GrillPromptInput): ScenarioPrompt {
  const { session } = input;
  const node = currentNode(session);
  const systemPrompt = `你是「辩思 MindGrill」的简历投递教练。

人设：${resumeCoach.persona}
追问立场：站在 HR 一面，对所有“看起来很厉害”的描述追问“具体多少 / 怎么做到的 / 凭什么可信”。绝不替用户改写简历。
追问侧重（简历投递场景）：
${resumeCoach.emphasis.map((e, i) => `${i + 1}. ${e}`).join("\n")}

输出要求（严格遵守）：
- 一次只问一个问题，必须能用 1-2 句中文回答。
- 必须给出 1 个 recommended_answer（最有可能打动 HR 的答案）+ 2 个 alternatives（不同侧重，必须言之有物）。
- 当草稿在该维度已有具体量化指标（数字 / 百分比 / 时长等）且表述可信时，把 can_skip=true，节点会被跳过。
- is_terminal 应谨慎设置：仅在至少完成 6 轮追问、且 STAR 各要素 + 反例都有实质性深度后才设 true。草稿越弱（量化越少），需要的追问轮次越多。不要在第 5 轮就提前终止。
- branch_id 用稳定的 kebab-case 短串（≤24 字符）。
- branch_kind 必须是 ARGUMENT/EVIDENCE/REBUTTAL/REVISION 之一。
- 中文输出，简体优先；语气专业、直接、不卖弄。
`;

  const userPrompt = `场景：简历投递（项目经历 / 实习 / 工作经验）
${progressLine(session)}
${renderActiveContext(session)}
当前需要追问的节点：${describeNode(node)}

用户原稿（简历段落）：
"""
${session.draft}
"""

已完成的对话历史：
${renderTranscript(session)}

请基于以上语境，向用户提出下一轮 HR 视角的追问，并给出推荐答案、备选答案、推理说明。`;

  return { systemPrompt, userPrompt };
}
