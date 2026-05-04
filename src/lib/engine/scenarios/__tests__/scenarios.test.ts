import { describe, it, expect } from "vitest";

import {
  buildResumePrompt,
  buildSocialPrompt,
  buildThesisPrompt,
  getScenarioBuilder,
  resumeCoach,
  socialCoach,
  thesisCoach,
} from "@/lib/engine/scenarios";
import { createSession } from "@/lib/engine";
import type { ScenarioId } from "@/lib/schemas/grill";

const DRAFT = "我的论点是 AI 工具会影响大学生的写作思维。";

function freshSession(scenario: ScenarioId) {
  return createSession(scenario, `${DRAFT} 原稿原稿原稿原稿原稿原稿原稿原稿`);
}

describe("scenario prompt builders", () => {
  it("each builder returns systemPrompt + userPrompt strings", () => {
    for (const scenario of ["thesis", "resume", "social"] as const) {
      const session = freshSession(scenario);
      const prompt = getScenarioBuilder(scenario)({ session });
      expect(typeof prompt.systemPrompt).toBe("string");
      expect(typeof prompt.userPrompt).toBe("string");
      expect(prompt.systemPrompt.length).toBeGreaterThan(50);
      expect(prompt.userPrompt.length).toBeGreaterThan(50);
    }
  });

  it("thesis prompt mentions academic persona + active node + draft", () => {
    const session = freshSession("thesis");
    const { systemPrompt, userPrompt } = buildThesisPrompt({ session });
    expect(systemPrompt).toContain(thesisCoach.persona);
    expect(systemPrompt).toContain("学术教练");
    expect(userPrompt).toContain(DRAFT);
    // active node label should appear as 当前需要追问的节点
    expect(userPrompt).toContain("当前需要追问的节点");
  });

  it("resume prompt mentions HR persona + STAR keyword + can_skip rule", () => {
    const session = freshSession("resume");
    const { systemPrompt, userPrompt } = buildResumePrompt({ session });
    expect(systemPrompt).toContain(resumeCoach.persona);
    expect(systemPrompt).toContain("HR");
    expect(systemPrompt).toContain("STAR");
    expect(systemPrompt).toContain("can_skip");
    expect(userPrompt).toContain(DRAFT);
  });

  it("social prompt mentions editor persona + reader empathy + can_skip rule", () => {
    const session = freshSession("social");
    const { systemPrompt, userPrompt } = buildSocialPrompt({ session });
    expect(systemPrompt).toContain(socialCoach.persona);
    expect(systemPrompt).toContain("编辑");
    expect(systemPrompt).toMatch(/钩子|代入|读者/);
    expect(systemPrompt).toContain("can_skip");
    expect(userPrompt).toContain(DRAFT);
  });

  it("getScenarioBuilder dispatches correctly per id", () => {
    expect(getScenarioBuilder("thesis")).toBe(buildThesisPrompt);
    expect(getScenarioBuilder("resume")).toBe(buildResumePrompt);
    expect(getScenarioBuilder("social")).toBe(buildSocialPrompt);
  });

  it("each builder documents the GrillQuestion schema fields", () => {
    for (const scenario of ["thesis", "resume", "social"] as const) {
      const session = freshSession(scenario);
      const { systemPrompt } = getScenarioBuilder(scenario)({ session });
      // Critical schema fields the LLM is expected to fill must be referenced
      // somewhere in the system prompt.
      expect(systemPrompt).toContain("recommended_answer");
      expect(systemPrompt).toContain("alternatives");
      expect(systemPrompt).toContain("can_skip");
      expect(systemPrompt).toContain("is_terminal");
      expect(systemPrompt).toContain("branch_id");
      expect(systemPrompt).toContain("branch_kind");
    }
  });
});
