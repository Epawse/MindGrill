import type { GrillSession, ScenarioId } from "@/lib/schemas/grill";

/**
 * The shape every scenario prompt builder consumes / returns.
 */
export interface GrillPromptInput {
  session: GrillSession;
}

export interface ScenarioPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export interface CoachMeta {
  id: ScenarioId;
  zhTitle: string;
  enTitle: string;
  oneLiner: string;
  persona: string;
  emphasis: string[];
  accentClass: string; // tailwind utility
}
