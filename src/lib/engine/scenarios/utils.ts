import type {
  DecisionTreeNode,
  GrillSession,
} from "@/lib/schemas/grill";
import {
  ancestorChain,
  resolvedCount,
  transcript,
} from "@/lib/engine/session";

/**
 * Render the resolved Q/A pairs (reasoning history) for the LLM.
 * Returns a string suitable to inline in a Chinese prompt.
 */
export function renderTranscript(session: GrillSession): string {
  const items = transcript(session);
  if (items.length === 0) return "（暂无对话历史）";
  return items
    .map(
      (entry, idx) =>
        `${idx + 1}. [${entry.label}] AI 问：${entry.question}\n   用户答：${entry.answer}`,
    )
    .join("\n");
}

export function renderActiveContext(session: GrillSession): string {
  const chain = ancestorChain(session);
  const node = chain[chain.length - 1];
  if (!node) return "（无活动节点）";
  const path = chain
    .map((n) => `${n.label}(${n.kind})`)
    .join(" → ");
  return `当前活动节点路径：${path}`;
}

export function progressLine(session: GrillSession): string {
  const visited = resolvedCount(session);
  return `已完成第 ${visited} 轮 / 目标 5–8 轮`;
}

export function describeNode(node: DecisionTreeNode | null): string {
  if (!node) return "（暂无节点）";
  return `节点 id=${node.id}；类型=${node.kind}；标签=${node.label}`;
}
