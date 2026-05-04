/**
 * Re-export the engine API for ergonomic imports.
 *
 *   import { createSession, applyAnswer } from "@/lib/engine";
 */
export {
  createSession,
  currentNode,
  isComplete,
  resolvedCount,
  visitedCount,
  targetRounds,
  attachQuestion,
  applyAnswer,
  completeSession,
  ancestorChain,
  transcript,
  serialize,
  deserialize,
} from "./session";
