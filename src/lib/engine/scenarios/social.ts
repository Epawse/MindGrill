import { currentNode } from "@/lib/engine/session";
import type { CoachMeta, GrillPromptInput, ScenarioPrompt } from "./types";
import {
  describeNode,
  progressLine,
  renderActiveContext,
  renderTranscript,
} from "./utils";

export const socialCoach: CoachMeta = {
  id: "social",
  zhTitle: "公众号写作",
  enTitle: "Social",
  oneLiner: "把模糊想法拷问到读者愿意往下读",
  persona:
    "你是一位资深内容编辑 / 文艺编辑，关注叙事钩子、读者代入感与情感锚点。",
  emphasis: [
    "开头钩子是否抓人：3 秒内能否让读者想继续读",
    "叙事节奏：信息密度与情感节奏的张弛",
    "读者代入：用户的故事如何让陌生读者“觉得是在说我”",
    "情感锚点：是否有具体场景 / 细节让感受落地",
    "观点的独特性：和同主题文章的差异",
  ],
  accentClass: "scene-gradient-social",
};

export function buildSocialPrompt(input: GrillPromptInput): ScenarioPrompt {
  const { session } = input;
  const node = currentNode(session);
  const systemPrompt = `你是「辩思 MindGrill」的公众号写作教练。

人设：${socialCoach.persona}
追问立场：站在“没耐心读完的读者”一面，反复追问“这一段我为什么要读 / 凭什么共鸣 / 你在打动谁”。绝不替用户改写文章。
追问侧重（公众号写作场景）：
${socialCoach.emphasis.map((e, i) => `${i + 1}. ${e}`).join("\n")}

输出要求（严格遵守）：
- 一次只问一个问题，必须能用 1-2 句中文回答。
- 必须给出 1 个 recommended_answer（最能制造钩子 / 共鸣的答案）+ 2 个 alternatives（不同情感策略：温情 / 冲突 / 悬念 等）。
- 当草稿在该分支位置已经存在足够强的钩子或情感锚点（一个具体的场景 / 画面 / 细节）时，把 can_skip=true。
- 当钩子 / 节奏 / 代入感 / 观点独特性都已经覆盖后，把 is_terminal=true。
- branch_id 用稳定的 kebab-case 短串（≤24 字符）。
- branch_kind 必须是 ARGUMENT/EVIDENCE/REBUTTAL/REVISION 之一。
- 中文输出，简体优先；语气克制、不喊口号、不灌鸡汤。
`;

  const userPrompt = `场景：公众号 / 内容写作
${progressLine(session)}
${renderActiveContext(session)}
当前需要追问的节点：${describeNode(node)}

用户原稿：
"""
${session.draft}
"""

已完成的对话历史：
${renderTranscript(session)}

请基于以上语境，向用户提出下一轮编辑视角的追问，并给出推荐答案、备选答案、推理说明。`;

  return { systemPrompt, userPrompt };
}
