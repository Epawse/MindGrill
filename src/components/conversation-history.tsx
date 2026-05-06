"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

import { BRANCH_KIND_LABEL, type BranchKind } from "@/lib/schemas/grill";
import type { GrillSession } from "@/lib/schemas/grill";

interface HistoryEntry {
  round: number;
  kind: BranchKind;
  label: string;
  question: string;
  answerText: string;
  answerSource: string;
}

function buildHistory(session: GrillSession): HistoryEntry[] {
  const nodes = Object.values(session.nodes)
    .filter((n) => n.status === "RESOLVED" && n.question && n.answer)
    .sort((a, b) => a.createdAt - b.createdAt);

  return nodes.map((n, i) => ({
    round: i + 1,
    kind: n.kind as BranchKind,
    label: n.label ?? BRANCH_KIND_LABEL[n.kind as BranchKind],
    question: n.question!.question,
    answerText: n.answer!.text,
    answerSource: n.answer!.source,
  }));
}

const KIND_COLORS: Record<BranchKind, string> = {
  ARGUMENT: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  EVIDENCE: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  REBUTTAL: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  REVISION: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
};

const KIND_DOT: Record<BranchKind, string> = {
  ARGUMENT: "bg-amber-500",
  EVIDENCE: "bg-blue-500",
  REBUTTAL: "bg-rose-500",
  REVISION: "bg-emerald-500",
};

export function ConversationHistory({ session }: { session: GrillSession }) {
  const history = buildHistory(session);
  if (history.length === 0) return null;

  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (round: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(round)) next.delete(round);
      else next.add(round);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        className="text-xs text-[var(--color-fg-muted)] font-sans flex items-center gap-1 hover:text-[var(--color-fg)] transition-colors"
        onClick={() => {
          if (expanded.size === history.length) setExpanded(new Set());
          else setExpanded(new Set(history.map((h) => h.round)));
        }}
      >
        已完成 {history.length} 轮
      </button>

      <div className="flex flex-col gap-1">
        {history.map((entry) => {
          const isExpanded = expanded.has(entry.round);
          return (
            <div key={entry.round}>
              <button
                type="button"
                onClick={() => toggle(entry.round)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-sm hover:bg-[var(--color-bg-pampas)] transition-colors group"
              >
                <span
                  className={`shrink-0 w-1.5 h-1.5 rounded-full ${KIND_DOT[entry.kind]}`}
                />
                <span
                  className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${KIND_COLORS[entry.kind]}`}
                >
                  {BRANCH_KIND_LABEL[entry.kind]}
                </span>
                <span className="truncate text-[var(--color-fg-muted)] text-xs flex-1">
                  {entry.question.slice(0, 40)}
                  {entry.question.length > 40 ? "…" : ""}
                </span>
                <ChevronDown
                  className={`size-3.5 shrink-0 text-[var(--color-fg-muted)] transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pr-2 py-2 text-xs text-[var(--color-fg-muted)] space-y-1 border-l-2 border-[var(--color-bg-pampas)] ml-1">
                      <p>
                        <span className="font-medium text-[var(--color-fg)]">
                          Q:
                        </span>{" "}
                        {entry.question}
                      </p>
                      <p>
                        <span className="font-medium text-[var(--color-accent)]">
                          A:
                        </span>{" "}
                        {entry.answerText.slice(0, 120)}
                        {entry.answerText.length > 120 ? "…" : ""}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}