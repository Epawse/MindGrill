import { describe, it, expect } from "vitest";

import {
  applyAnswer,
  attachQuestion,
  completeSession,
  createSession,
  currentNode,
  deserialize,
  isComplete,
  resolvedCount,
  serialize,
  targetRounds,
  visitedCount,
} from "@/lib/engine";
import {
  BranchKind,
  EnginePhase,
  type GrillQuestion,
  NodeStatus,
  type UserAnswer,
} from "@/lib/schemas/grill";

function makeQuestion(overrides: Partial<GrillQuestion> = {}): GrillQuestion {
  return {
    branch_id: "test-arg",
    branch_kind: BranchKind.ARGUMENT,
    branch_label: "核心论点",
    question: "你的核心论点究竟是什么？",
    recommended_answer: "AI 写作工具会让人懒于思考。",
    alternatives: ["AI 写作其实让人更高效。", "AI 让写作更有个性化。"],
    reasoning: "草稿没有明确的中心句。",
    can_skip: false,
    is_terminal: false,
    ...overrides,
  };
}

function makeAnswer(text = "我的论点是 X。"): UserAnswer {
  return { source: "RECOMMENDED", text, ts: Date.now() };
}

describe("engine state machine", () => {
  it("starts in INTAKE phase with a single root node", () => {
    const session = createSession("thesis", "这是一段足够长的草稿，用于测试。");
    expect(session.phase).toBe(EnginePhase.INTAKE);
    expect(Object.values(session.nodes)).toHaveLength(1);
    expect(session.activeNodeId).toBe(session.rootId);
    expect(currentNode(session)?.status).toBe(NodeStatus.ACTIVE);
  });

  it("attachQuestion moves engine to GRILLING and stores question on active node", () => {
    let session = createSession("thesis", "草稿草稿草稿草稿草稿草稿");
    session = attachQuestion(session, makeQuestion());
    expect(session.phase).toBe(EnginePhase.GRILLING);
    const node = currentNode(session);
    expect(node?.question?.question).toMatch(/核心论点/);
  });

  it("applyAnswer resolves the active node and spawns a child", () => {
    let session = createSession("thesis", "原稿原稿原稿原稿原稿原稿");
    session = attachQuestion(session, makeQuestion());
    const beforeId = session.activeNodeId!;
    session = applyAnswer(session, makeAnswer());
    expect(session.nodes[beforeId]?.status).toBe(NodeStatus.RESOLVED);
    expect(session.activeNodeId).not.toBe(beforeId);
    expect(currentNode(session)?.status).toBe(NodeStatus.ACTIVE);
    expect(resolvedCount(session)).toBe(1);
  });

  it("can_skip path skips a node without consuming a round", () => {
    let session = createSession("thesis", "原稿原稿原稿原稿原稿原稿");
    const visitedBefore = visitedCount(session);
    session = attachQuestion(session, makeQuestion({ can_skip: true }));
    // Skipping advances active node to a child but the previous node is SKIPPED, not RESOLVED.
    const skipped = Object.values(session.nodes).find(
      (n) => n.status === NodeStatus.SKIPPED,
    );
    expect(skipped).toBeDefined();
    expect(resolvedCount(session)).toBe(0);
    // visitedCount counts SKIPPED + RESOLVED, so it incremented by 1.
    expect(visitedCount(session)).toBe(visitedBefore + 1);
    // No round was consumed in the "RESOLVED" sense.
    expect(currentNode(session)?.status).toBe(NodeStatus.ACTIVE);
  });

  it("respects the 5–8 round target window: terminates by MAX after MIN", () => {
    const { min, max } = targetRounds();
    expect(min).toBe(5);
    expect(max).toBe(8);

    let session = createSession("thesis", "原稿".repeat(50));
    // Run MAX rounds without can_skip — engine should switch to THINKING after MAX.
    for (let i = 0; i < max; i += 1) {
      session = attachQuestion(
        session,
        makeQuestion({ branch_id: `q-${i}`, is_terminal: false }),
      );
      session = applyAnswer(session, makeAnswer(`answer ${i}`));
      if (session.phase === EnginePhase.THINKING) break;
    }
    expect(session.phase).toBe(EnginePhase.THINKING);
    expect(resolvedCount(session)).toBeGreaterThanOrEqual(min);
    expect(resolvedCount(session)).toBeLessThanOrEqual(max);
  });

  it("is_terminal short-circuits to THINKING immediately after answer", () => {
    let session = createSession("thesis", "原稿".repeat(50));
    session = attachQuestion(session, makeQuestion());
    session = applyAnswer(session, makeAnswer());
    session = attachQuestion(session, makeQuestion({ branch_id: "q-2", is_terminal: true }));
    session = applyAnswer(session, makeAnswer());
    expect(session.phase).toBe(EnginePhase.THINKING);
    expect(session.activeNodeId).toBeNull();
  });

  it("completeSession attaches revision and moves to COMPLETE", () => {
    let session = createSession("resume", "原稿".repeat(20));
    session = attachQuestion(session, makeQuestion({ is_terminal: true }));
    session = applyAnswer(session, makeAnswer());
    expect(session.phase).toBe(EnginePhase.THINKING);
    session = completeSession(session, {
      revised_draft: "新的改稿",
      summary: "修补论据",
      key_changes: ["补充量化指标", "去掉空话"],
    });
    expect(session.phase).toBe(EnginePhase.COMPLETE);
    expect(isComplete(session)).toBe(true);
    expect(session.revision?.revised_draft).toBe("新的改稿");
  });

  it("serialize / deserialize roundtrip preserves the session", () => {
    let session = createSession("social", "原稿".repeat(20));
    session = attachQuestion(session, makeQuestion());
    session = applyAnswer(session, makeAnswer());
    const json = serialize(session);
    const restored = deserialize(json);
    expect(restored).toEqual(session);
  });
});
