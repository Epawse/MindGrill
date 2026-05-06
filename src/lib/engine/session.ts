/**
 * Decision tree state machine — pure TypeScript.
 *
 * 4-state engine: INTAKE → GRILLING → THINKING → COMPLETE
 * Map-based node graph; serializable to JSON for Supabase jsonb storage.
 *
 * No React, no Next.js — usable from any JS runtime.
 */
import {
  BranchKind,
  EnginePhase,
  GrillSessionSchema,
  NodeStatus,
} from "@/lib/schemas/grill";
import type {
  DecisionTreeNode,
  GrillQuestion,
  GrillSession,
  Revision,
  ScenarioId,
  UserAnswer,
} from "@/lib/schemas/grill";

const MIN_ROUNDS = 5;
const MAX_ROUNDS = 8;

function randomId(prefix: string): string {
  // crypto.randomUUID exists in Node 19+ and modern browsers; fall back to Math.random.
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  if (crypto?.randomUUID) {
    return `${prefix}_${crypto.randomUUID().split("-")[0]}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function now(): number {
  return Date.now();
}

// ---------- session lifecycle ----------

export function createSession(
  scenario: ScenarioId,
  draft: string,
): GrillSession {
  const ts = now();
  const rootId = randomId("root");
  const root: DecisionTreeNode = {
    id: rootId,
    parentId: null,
    kind: BranchKind.ARGUMENT,
    label: "核心论点",
    status: NodeStatus.ACTIVE,
    question: null,
    answer: null,
    childIds: [],
    createdAt: ts,
    resolvedAt: null,
  };

  return {
    id: randomId("sess"),
    scenario,
    draft,
    phase: EnginePhase.INTAKE,
    rootId,
    activeNodeId: rootId,
    nodes: { [rootId]: root },
    revision: null,
    createdAt: ts,
    updatedAt: ts,
    completedAt: null,
  };
}

// ---------- selectors ----------

export function currentNode(session: GrillSession): DecisionTreeNode | null {
  if (!session.activeNodeId) return null;
  return session.nodes[session.activeNodeId] ?? null;
}

export function isComplete(session: GrillSession): boolean {
  return session.phase === EnginePhase.COMPLETE;
}

export function resolvedCount(session: GrillSession): number {
  return Object.values(session.nodes).filter(
    (n) => n.status === NodeStatus.RESOLVED,
  ).length;
}

export function visitedCount(session: GrillSession): number {
  return Object.values(session.nodes).filter(
    (n) =>
      n.status === NodeStatus.RESOLVED || n.status === NodeStatus.SKIPPED,
  ).length;
}

export function targetRounds(): { min: number; max: number } {
  return { min: MIN_ROUNDS, max: MAX_ROUNDS };
}

// ---------- mutations ----------

/**
 * Apply the LLM's question to the active node — moves the engine into GRILLING.
 * Idempotent: if the active node already has the same question, returns the session unchanged.
 */
export function attachQuestion(
  session: GrillSession,
  question: GrillQuestion,
): GrillSession {
  const node = currentNode(session);
  if (!node) throw new Error("attachQuestion: no active node");

  // If LLM asked us to skip this branch, mark SKIPPED + advance the active pointer.
  if (question.can_skip) {
    return finishNode(
      {
        ...session,
        nodes: {
          ...session.nodes,
          [node.id]: {
            ...node,
            question,
            status: NodeStatus.SKIPPED,
            resolvedAt: now(),
          },
        },
        phase: EnginePhase.GRILLING,
      },
      node.id,
    );
  }

  return {
    ...session,
    phase: EnginePhase.GRILLING,
    updatedAt: now(),
    nodes: {
      ...session.nodes,
      [node.id]: {
        ...node,
        question,
        kind: question.branch_kind,
        label: question.branch_label,
        status: NodeStatus.ACTIVE,
      },
    },
  };
}

/**
 * Apply user's answer to the active node, mark RESOLVED, and create the next
 * pending child node. Returns a session whose `activeNodeId` is the new child.
 *
 * If the engine has reached MAX_ROUNDS or the LLM marked the node `is_terminal`,
 * the session moves into the THINKING phase awaiting a final revision.
 */
export function applyAnswer(
  session: GrillSession,
  answer: UserAnswer,
): GrillSession {
  const node = currentNode(session);
  if (!node) throw new Error("applyAnswer: no active node");

  const isTerminal = node.question?.is_terminal === true;
  const visited = visitedCount(session) + 1;
  const reachedMax = visited >= MAX_ROUNDS;
  // Enforce minimum: ignore is_terminal before 6 rounds to prevent premature termination
  const effectiveTerminal = isTerminal && visited >= 6;

  const resolved: DecisionTreeNode = {
    ...node,
    answer,
    status: NodeStatus.RESOLVED,
    resolvedAt: now(),
  };

  let next: GrillSession = {
    ...session,
    nodes: { ...session.nodes, [node.id]: resolved },
    updatedAt: now(),
  };

  if (effectiveTerminal || (reachedMax && visited >= MIN_ROUNDS)) {
    return {
      ...next,
      phase: EnginePhase.THINKING,
      activeNodeId: null,
    };
  }

  // Spawn a child to grill next.
  const childId = randomId("node");
  const child: DecisionTreeNode = {
    id: childId,
    parentId: node.id,
    kind: nextKind(node.kind),
    label: defaultLabelForKind(nextKind(node.kind)),
    status: NodeStatus.ACTIVE,
    question: null,
    answer: null,
    childIds: [],
    createdAt: now(),
    resolvedAt: null,
  };

  next = {
    ...next,
    nodes: {
      ...next.nodes,
      [childId]: child,
      [node.id]: { ...resolved, childIds: [...resolved.childIds, childId] },
    },
    activeNodeId: childId,
  };
  return next;
}

/**
 * Advance the engine after a node has been auto-skipped (`can_skip`).
 * Creates a new ACTIVE child whose kind follows the natural sequence.
 */
function finishNode(session: GrillSession, finishedId: string): GrillSession {
  const finished = session.nodes[finishedId];
  if (!finished) return session;

  const visited = visitedCount(session);
  if (visited >= MAX_ROUNDS) {
    return { ...session, phase: EnginePhase.THINKING, activeNodeId: null };
  }

  const childId = randomId("node");
  const childKind = nextKind(finished.kind);
  const child: DecisionTreeNode = {
    id: childId,
    parentId: finished.id,
    kind: childKind,
    label: defaultLabelForKind(childKind),
    status: NodeStatus.ACTIVE,
    question: null,
    answer: null,
    childIds: [],
    createdAt: now(),
    resolvedAt: null,
  };

  return {
    ...session,
    nodes: {
      ...session.nodes,
      [childId]: child,
      [finished.id]: {
        ...finished,
        childIds: [...finished.childIds, childId],
      },
    },
    activeNodeId: childId,
    updatedAt: now(),
  };
}

function nextKind(kind: BranchKind): BranchKind {
  switch (kind) {
    case BranchKind.ARGUMENT:
      return BranchKind.EVIDENCE;
    case BranchKind.EVIDENCE:
      return BranchKind.REBUTTAL;
    case BranchKind.REBUTTAL:
      return BranchKind.REVISION;
    case BranchKind.REVISION:
      // After revision, re-examine the refined argument before gathering new evidence.
      return BranchKind.ARGUMENT;
  }
}

function defaultLabelForKind(kind: BranchKind): string {
  switch (kind) {
    case BranchKind.ARGUMENT:
      return "核心论点";
    case BranchKind.EVIDENCE:
      return "关键证据";
    case BranchKind.REBUTTAL:
      return "反驳与盲点";
    case BranchKind.REVISION:
      return "修正与升华";
  }
}

/**
 * Attach the AI-generated revision and mark the session COMPLETE.
 */
export function completeSession(
  session: GrillSession,
  revision: Revision,
): GrillSession {
  return {
    ...session,
    revision,
    phase: EnginePhase.COMPLETE,
    activeNodeId: null,
    completedAt: now(),
    updatedAt: now(),
  };
}

// ---------- traversal helpers (used by visualization & prompt builders) ----------

/**
 * Walk the active path from root → activeNode (inclusive of resolved ancestors,
 * useful for prompts asking the LLM to consider history).
 */
export function ancestorChain(session: GrillSession): DecisionTreeNode[] {
  const chain: DecisionTreeNode[] = [];
  let cursor: DecisionTreeNode | null = currentNode(session);
  while (cursor) {
    chain.push(cursor);
    cursor = cursor.parentId ? (session.nodes[cursor.parentId] ?? null) : null;
  }
  return chain.reverse();
}

export function transcript(session: GrillSession): Array<{
  question: string;
  answer: string;
  kind: BranchKind;
  label: string;
}> {
  return Object.values(session.nodes)
    .filter((n) => n.status === NodeStatus.RESOLVED && n.question && n.answer)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((n) => ({
      question: n.question!.question,
      answer: n.answer!.text,
      kind: n.kind,
      label: n.label,
    }));
}

// ---------- serialization ----------

export function serialize(session: GrillSession): string {
  return JSON.stringify(session);
}

export function deserialize(json: string): GrillSession {
  const raw = JSON.parse(json) as unknown;
  return GrillSessionSchema.parse(raw);
}
