/**
 * Scenario prompt registry — exposes a builder per scenario id.
 */
import type { ScenarioId } from "@/lib/schemas/grill";
import type { CoachMeta, GrillPromptInput, ScenarioPrompt } from "./types";
import { buildThesisPrompt, thesisCoach } from "./thesis";
import { buildResumePrompt, resumeCoach } from "./resume";
import { buildSocialPrompt, socialCoach } from "./social";
import { buildRevisionPrompt } from "./revision";

export type { GrillPromptInput, ScenarioPrompt, CoachMeta };

export type ScenarioBuilder = (input: GrillPromptInput) => ScenarioPrompt;

export const SCENARIO_BUILDERS: Record<ScenarioId, ScenarioBuilder> = {
  thesis: buildThesisPrompt,
  resume: buildResumePrompt,
  social: buildSocialPrompt,
};

export const SCENARIO_COACHES: Record<ScenarioId, CoachMeta> = {
  thesis: thesisCoach,
  resume: resumeCoach,
  social: socialCoach,
};

/** Dispatch a builder by scenario id. Throws on unknown scenario. */
export function getScenarioBuilder(scenario: ScenarioId): ScenarioBuilder {
  const fn = SCENARIO_BUILDERS[scenario];
  if (!fn) throw new Error(`unknown scenario: ${scenario}`);
  return fn;
}

/** Convenience: build the prompt for a given scenario in one call. */
export function buildScenarioPrompt(
  scenario: ScenarioId,
  input: GrillPromptInput,
): ScenarioPrompt {
  return getScenarioBuilder(scenario)(input);
}

export {
  buildThesisPrompt,
  buildResumePrompt,
  buildSocialPrompt,
  buildRevisionPrompt,
  thesisCoach,
  resumeCoach,
  socialCoach,
};
