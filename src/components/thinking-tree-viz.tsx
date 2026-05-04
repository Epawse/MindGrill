"use client";

/**
 * 思维进化树可视化 (ThinkingTreeViz)
 *
 * Renders the GrillSession's decision tree as a top-down React Flow graph.
 * Layout uses a deterministic BFS layering algorithm (no extra dagre dep).
 *
 * Visual contract per PRD § grill 1.5:
 *   - PENDING → muted gray
 *   - ACTIVE  → terracotta accent
 *   - RESOLVED → scenario gradient (passed via `accentGradient` prop)
 *   - SKIPPED → ghost (low opacity, dashed border)
 *
 * The "Replay" button animates each RESOLVED node sequentially in BFS order,
 * letting evaluators see the user's "from blurry → clear" thinking arc as a
 * 30-frame highlight pulse. Pause/restart controls included.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BRANCH_KIND_LABEL,
  NodeStatus,
  type DecisionTreeNode,
  type GrillSession,
  type ScenarioId,
} from "@/lib/schemas/grill";

// ----- layout -----

const NODE_WIDTH = 220;
const NODE_HEIGHT = 96;
const X_GAP = 40;
const Y_GAP = 56;

interface LaidOutNode {
  id: string;
  x: number;
  y: number;
  depth: number;
  data: DecisionTreeNode;
}

function layoutBFS(
  rootId: string,
  nodes: Record<string, DecisionTreeNode>,
): LaidOutNode[] {
  // Compute subtree leaf counts to assign horizontal slots.
  const leafCount: Record<string, number> = {};
  function leafSize(id: string): number {
    if (id in leafCount) return leafCount[id];
    const node = nodes[id];
    if (!node || node.childIds.length === 0) {
      leafCount[id] = 1;
      return 1;
    }
    let sum = 0;
    for (const c of node.childIds) sum += leafSize(c);
    leafCount[id] = sum;
    return sum;
  }
  leafSize(rootId);

  const out: LaidOutNode[] = [];
  function place(id: string, depth: number, leftSlot: number) {
    const node = nodes[id];
    if (!node) return;
    const span = leafCount[id] ?? 1;
    const centerSlot = leftSlot + span / 2;
    const x = centerSlot * (NODE_WIDTH + X_GAP) - NODE_WIDTH / 2;
    const y = depth * (NODE_HEIGHT + Y_GAP);
    out.push({ id, x, y, depth, data: node });
    let cursor = leftSlot;
    for (const cid of node.childIds) {
      const cspan = leafCount[cid] ?? 1;
      place(cid, depth + 1, cursor);
      cursor += cspan;
    }
  }
  place(rootId, 0, 0);
  return out;
}

// ----- visual node -----

interface NodeData extends Record<string, unknown> {
  decisionNode: DecisionTreeNode;
  scenario: ScenarioId;
  highlighted: boolean;
}

const SCENARIO_GRADIENTS: Record<ScenarioId, string> = {
  thesis: "linear-gradient(135deg, var(--scene-thesis-0), var(--scene-thesis-1))",
  resume: "linear-gradient(135deg, var(--scene-resume-0), var(--scene-resume-1))",
  social: "linear-gradient(135deg, var(--scene-social-0), var(--scene-social-1))",
};

function statusVisual(
  status: NodeStatus,
  scenario: ScenarioId,
  highlighted: boolean,
): {
  background: string;
  borderColor: string;
  textColor: string;
  opacity: number;
  borderStyle: string;
  boxShadow: string;
} {
  if (status === NodeStatus.SKIPPED) {
    return {
      background: "transparent",
      borderColor: "var(--color-fg-muted)",
      textColor: "var(--color-fg-muted)",
      opacity: 0.6,
      borderStyle: "dashed",
      boxShadow: "none",
    };
  }
  if (status === NodeStatus.PENDING) {
    return {
      background: "var(--color-bg-card)",
      borderColor: "var(--color-border)",
      textColor: "var(--color-fg-muted)",
      opacity: 1,
      borderStyle: "solid",
      boxShadow: "var(--glass-shadow)",
    };
  }
  if (status === NodeStatus.ACTIVE) {
    return {
      background: "var(--color-bg-card)",
      borderColor: "var(--color-accent)",
      textColor: "var(--color-fg)",
      opacity: 1,
      borderStyle: "solid",
      boxShadow:
        "0 0 0 3px color-mix(in srgb, var(--color-accent) 22%, transparent), var(--glass-shadow)",
    };
  }
  // RESOLVED
  return {
    background: SCENARIO_GRADIENTS[scenario],
    borderColor: "transparent",
    textColor: "#fff",
    opacity: 1,
    borderStyle: "solid",
    boxShadow: highlighted
      ? "0 0 0 4px color-mix(in srgb, var(--color-accent) 60%, transparent), 0 8px 24px rgba(0,0,0,0.18)"
      : "0 4px 14px rgba(0,0,0,0.10)",
  };
}

function TreeNodeView({ data }: NodeProps) {
  const d = data as NodeData;
  const node = d.decisionNode;
  const v = statusVisual(node.status, d.scenario, d.highlighted);
  const answerText = node.answer?.text ?? null;
  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: d.highlighted ? 1.04 : 1, opacity: v.opacity }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      style={{
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        padding: 12,
        borderRadius: "var(--radius-card)",
        background: v.background,
        border: `1.5px ${v.borderStyle} ${v.borderColor}`,
        color: v.textColor,
        boxShadow: v.boxShadow,
        backdropFilter: "blur(var(--glass-blur))",
        fontFamily: "var(--font-sans)",
      }}
      title={
        node.question
          ? `${node.question.question}\n\n推荐答案: ${node.question.recommended_answer}\n用户回答: ${answerText ?? "（未回答）"}\n\n推理: ${node.question.reasoning}`
          : node.label
      }
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide opacity-80 mb-1">
        <span>{BRANCH_KIND_LABEL[node.kind]}</span>
        <span>{node.status}</span>
      </div>
      <div className="font-serif text-sm leading-snug line-clamp-2">
        {node.label}
      </div>
      {answerText && (
        <div className="mt-1 text-xs opacity-90 line-clamp-2">
          ✓ {answerText}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </motion.div>
  );
}

const nodeTypes = { tree: TreeNodeView };

// ----- main -----

interface ThinkingTreeVizProps {
  session: GrillSession;
  className?: string;
  height?: number;
}

export function ThinkingTreeViz({
  session,
  className,
  height = 480,
}: ThinkingTreeVizProps) {
  const layout = useMemo(
    () => layoutBFS(session.rootId, session.nodes),
    [session.rootId, session.nodes],
  );

  const resolvedOrder = useMemo(() => {
    return layout
      .filter((n) => n.data.status === NodeStatus.RESOLVED)
      .sort(
        (a, b) =>
          (a.data.resolvedAt ?? a.data.createdAt) -
          (b.data.resolvedAt ?? b.data.createdAt),
      )
      .map((n) => n.id);
  }, [layout]);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const replayRef = useRef<number | null>(null);

  const stopReplay = useCallback(() => {
    if (replayRef.current !== null) {
      window.clearTimeout(replayRef.current);
      replayRef.current = null;
    }
    setPlaying(false);
  }, []);

  const startReplay = useCallback(() => {
    if (resolvedOrder.length === 0) return;
    setPlaying(true);
    let i = 0;
    const tick = () => {
      if (i >= resolvedOrder.length) {
        replayRef.current = window.setTimeout(() => {
          setHighlightedId(null);
          setPlaying(false);
        }, 600);
        return;
      }
      setHighlightedId(resolvedOrder[i]);
      i += 1;
      replayRef.current = window.setTimeout(tick, 600);
    };
    tick();
  }, [resolvedOrder]);

  useEffect(() => {
    return () => {
      if (replayRef.current !== null) {
        window.clearTimeout(replayRef.current);
      }
    };
  }, []);

  const nodes: Node<NodeData>[] = layout.map((l) => ({
    id: l.id,
    type: "tree",
    position: { x: l.x, y: l.y },
    draggable: false,
    data: {
      decisionNode: l.data,
      scenario: session.scenario,
      highlighted: l.id === highlightedId,
    },
  }));

  const edges: Edge[] = [];
  for (const l of layout) {
    for (const cid of l.data.childIds) {
      edges.push({
        id: `${l.id}->${cid}`,
        source: l.id,
        target: cid,
        type: "smoothstep",
        style: {
          stroke: "var(--color-fg-muted)",
          strokeWidth: 1.5,
          opacity: 0.5,
        },
        animated: false,
      });
    }
  }

  const resolvedCount = resolvedOrder.length;

  return (
    <div
      className={`relative rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-hidden ${className ?? ""}`}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <h3 className="font-serif text-base text-[var(--color-fg)]">
            思维进化树
          </h3>
          <Badge variant="secondary" className="text-xs font-sans">
            {resolvedCount} 节点已澄清
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {playing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={stopReplay}
              className="h-7 px-2 text-xs"
            >
              <Pause className="size-3" /> 暂停
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={startReplay}
              disabled={resolvedCount === 0}
              className="h-7 px-2 text-xs"
            >
              <Play className="size-3" /> 回放
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopReplay();
              setHighlightedId(null);
            }}
            className="h-7 px-2 text-xs"
            title="重置"
          >
            <RotateCcw className="size-3" />
          </Button>
        </div>
      </div>
      <div style={{ height }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.4}
            maxZoom={1.4}
            zoomOnScroll={false}
            panOnScroll
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1}
              color="var(--color-border)"
            />
            <Controls showInteractive={false} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
