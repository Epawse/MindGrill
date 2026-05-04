/**
 * MindGrill 决策树引擎核心类型与 Zod schema。
 * 纯 TypeScript，无 React / Next.js 依赖；可序列化到 Supabase jsonb。
 */
import { z } from "zod";

// ----- 基础枚举 -----

export const SCENARIO_IDS = ["thesis", "resume", "social"] as const;
export const ScenarioId = z.enum(SCENARIO_IDS);
export type ScenarioId = z.infer<typeof ScenarioId>;

export const NodeStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  RESOLVED: "RESOLVED",
  SKIPPED: "SKIPPED",
} as const;
export type NodeStatus = (typeof NodeStatus)[keyof typeof NodeStatus];

export const BranchKind = {
  ARGUMENT: "ARGUMENT", // 论点
  EVIDENCE: "EVIDENCE", // 证据
  REBUTTAL: "REBUTTAL", // 反驳
  REVISION: "REVISION", // 修正
} as const;
export type BranchKind = (typeof BranchKind)[keyof typeof BranchKind];

export const EnginePhase = {
  INTAKE: "INTAKE",
  GRILLING: "GRILLING",
  THINKING: "THINKING",
  COMPLETE: "COMPLETE",
} as const;
export type EnginePhase = (typeof EnginePhase)[keyof typeof EnginePhase];

// ----- LLM 输出契约 -----

export const GrillQuestionSchema = z.object({
  branch_id: z
    .string()
    .min(1)
    .describe("当前节点的稳定 id，建议使用 kebab-case 或 uuid 片段"),
  branch_kind: z.enum([
    BranchKind.ARGUMENT,
    BranchKind.EVIDENCE,
    BranchKind.REBUTTAL,
    BranchKind.REVISION,
  ]),
  branch_label: z
    .string()
    .min(1)
    .describe("人类可读的分支标签，例如 “核心论点” “关键证据”"),
  question: z.string().min(4).describe("一次性向用户提出的中文追问"),
  recommended_answer: z
    .string()
    .min(2)
    .describe("AI 给出的推荐答案，用户一键采纳后即推进"),
  alternatives: z
    .array(z.string().min(2))
    .min(2)
    .max(2)
    .describe("两个备选答案，体现不同思路"),
  reasoning: z
    .string()
    .describe("AI 推理：为什么追问这个分支，引用草稿哪句话"),
  can_skip: z
    .boolean()
    .describe("如果草稿已直接答案明显，置 true，节点立刻 SKIPPED"),
  is_terminal: z
    .boolean()
    .describe("若已经覆盖所有重要分支，置 true，引擎进入 THINKING"),
});
export type GrillQuestion = z.infer<typeof GrillQuestionSchema>;

export const RevisionSchema = z.object({
  revised_draft: z.string().min(4),
  summary: z.string(),
  key_changes: z.array(z.string()).max(8),
});
export type Revision = z.infer<typeof RevisionSchema>;

// ----- 节点 + 用户回答 -----

export const UserAnswerSourceSchema = z.enum([
  "RECOMMENDED",
  "ALTERNATIVE_1",
  "ALTERNATIVE_2",
  "FREE_TEXT",
  "SKIP",
]);
export type UserAnswerSource = z.infer<typeof UserAnswerSourceSchema>;

export const UserAnswerSchema = z.object({
  source: UserAnswerSourceSchema,
  text: z.string(),
  ts: z.number(),
});
export type UserAnswer = z.infer<typeof UserAnswerSchema>;

export const DecisionTreeNodeSchema: z.ZodType<DecisionTreeNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    parentId: z.string().nullable(),
    kind: z.enum([
      BranchKind.ARGUMENT,
      BranchKind.EVIDENCE,
      BranchKind.REBUTTAL,
      BranchKind.REVISION,
    ]),
    label: z.string(),
    status: z.enum([
      NodeStatus.PENDING,
      NodeStatus.ACTIVE,
      NodeStatus.RESOLVED,
      NodeStatus.SKIPPED,
    ]),
    question: GrillQuestionSchema.nullable(),
    answer: UserAnswerSchema.nullable(),
    childIds: z.array(z.string()),
    createdAt: z.number(),
    resolvedAt: z.number().nullable(),
  }),
);

export interface DecisionTreeNode {
  id: string;
  parentId: string | null;
  kind: BranchKind;
  label: string;
  status: NodeStatus;
  question: GrillQuestion | null;
  answer: UserAnswer | null;
  childIds: string[];
  createdAt: number;
  resolvedAt: number | null;
}

// ----- 会话 -----

export const GrillSessionSchema = z.object({
  id: z.string(),
  scenario: ScenarioId,
  draft: z.string().min(1),
  phase: z.enum([
    EnginePhase.INTAKE,
    EnginePhase.GRILLING,
    EnginePhase.THINKING,
    EnginePhase.COMPLETE,
  ]),
  rootId: z.string(),
  activeNodeId: z.string().nullable(),
  // jsonb 内 nodes 用对象而非 Map，便于序列化
  nodes: z.record(z.string(), DecisionTreeNodeSchema),
  revision: RevisionSchema.nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().nullable(),
});
export type GrillSession = z.infer<typeof GrillSessionSchema>;

// ----- API 输入 / 输出 -----

export const StartInputSchema = z.object({
  scenario: ScenarioId,
  draft: z.string().min(20).max(8_000),
  providerId: z.string().optional(),
});
export type StartInput = z.infer<typeof StartInputSchema>;

export const AnswerInputSchema = z.object({
  session: GrillSessionSchema,
  answer: UserAnswerSchema,
  providerId: z.string().optional(),
});
export type AnswerInput = z.infer<typeof AnswerInputSchema>;
