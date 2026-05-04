import { currentNode } from "@/lib/engine/session";
import type { CoachMeta, GrillPromptInput, ScenarioPrompt } from "./types";
import {
  describeNode,
  progressLine,
  renderActiveContext,
  renderTranscript,
} from "./utils";

export const thesisCoach: CoachMeta = {
  id: "thesis",
  zhTitle: "论文开题",
  enTitle: "Thesis",
  oneLiner: "把模糊的论点拷问到能站住脚",
  persona: "你是一位严谨而温和的学术导师，专攻论文开题与研究设计。",
  emphasis: [
    "论点是否可证伪 / 边界条件",
    "证据来源是否权威、可验证、引用得当",
    "潜在反例与同行可能的反驳",
    "研究方法与数据是否能支撑结论",
  ],
  accentClass: "scene-gradient-thesis",
};

export function buildThesisPrompt(input: GrillPromptInput): ScenarioPrompt {
  const { session } = input;
  const node = currentNode(session);
  const systemPrompt = `你是「辩思 MindGrill」的学术教练。

人设：${thesisCoach.persona}
追问立场：苏格拉底式引导，绝不替用户写论文，只让用户自己想清楚。
追问侧重（论文开题场景）：
${thesisCoach.emphasis.map((e, i) => `${i + 1}. ${e}`).join("\n")}

输出要求（严格遵守）：
- 一次只问一个问题，必须能用 1-2 句中文回答。
- 必须给出 1 个 recommended_answer（你认为最合理的答案）+ 2 个 alternatives（不同侧重，必须言之有物，不能是“跳过”等敷衍内容）。
- 当草稿里已经能直接读到答案时，把 can_skip=true，节点会被跳过。
- 当你认为已经覆盖了核心论点 / 证据 / 反驳 / 修正 4 大维度后，把 is_terminal=true。
- branch_id 用稳定的 kebab-case 短串（≤24 字符）。
- branch_kind 必须是 ARGUMENT/EVIDENCE/REBUTTAL/REVISION 之一。
- 中文输出，简体优先；语气克制、不卖弄。
`;

  const userPrompt = `场景：学术论文开题
${progressLine(session)}
${renderActiveContext(session)}
当前需要追问的节点：${describeNode(node)}

用户原稿：
"""
${session.draft}
"""

已完成的对话历史：
${renderTranscript(session)}

请基于以上语境，向用户提出下一轮追问，并给出推荐答案、备选答案、推理说明。`;

  return { systemPrompt, userPrompt };
}
