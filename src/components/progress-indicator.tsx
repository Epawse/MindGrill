"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BRANCH_KIND_LABEL, type BranchKind } from "@/lib/schemas/grill";
import type { GrillSession } from "@/lib/schemas/grill";

interface ProgressIndicatorProps {
  visited: number;
  min?: number;
  max?: number;
  session?: GrillSession;
  className?: string;
}

const KIND_ORDER: BranchKind[] = [
  "ARGUMENT",
  "EVIDENCE",
  "REBUTTAL",
  "REVISION",
];

const KIND_COLORS: Record<BranchKind, string> = {
  ARGUMENT: "bg-amber-500",
  EVIDENCE: "bg-blue-500",
  REBUTTAL: "bg-rose-500",
  REVISION: "bg-emerald-500",
};

function getCoveredKinds(session: GrillSession | undefined): Set<BranchKind> {
  if (!session) return new Set();
  const covered = new Set<BranchKind>();
  for (const node of Object.values(session.nodes)) {
    if (node.status === "RESOLVED" || node.status === "SKIPPED") {
      covered.add(node.kind as BranchKind);
    }
  }
  return covered;
}

function getCurrentKind(
  session: GrillSession | undefined,
): BranchKind | null {
  if (!session) return null;
  const active = Object.values(session.nodes).find(
    (n) => n.status === "ACTIVE",
  );
  return active ? (active.kind as BranchKind) : null;
}

/**
 * Renders the progress bar + dimension coverage dots.
 */
export function ProgressIndicator({
  visited,
  min = 6,
  max = 8,
  session,
  className,
}: ProgressIndicatorProps) {
  const safeVisited = Math.max(0, Math.min(visited, max));
  const pct = Math.round((safeVisited / max) * 100);
  const covered = getCoveredKinds(session);
  const currentKind = getCurrentKind(session);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-sans text-[var(--color-fg-muted)]">
          已问{" "}
          <strong className="text-[var(--color-fg)]">{safeVisited}</strong> /
          目标 {min}–{max} 轮
        </span>
        <span className="text-xs text-[var(--color-fg-muted)] tabular-nums">
          {pct}%
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
      {session && (
        <div className="flex items-center gap-3 pt-0.5">
          {KIND_ORDER.map((kind) => {
            const isCovered = covered.has(kind);
            const isCurrent = currentKind === kind;
            return (
              <span
                key={kind}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-sans transition-opacity",
                  isCovered
                    ? "opacity-100"
                    : isCurrent
                      ? "opacity-70"
                      : "opacity-30",
                )}
              >
                <span
                  className={cn(
                    "inline-block w-1.5 h-1.5 rounded-full",
                    isCovered ? KIND_COLORS[kind] : "bg-[var(--color-fg-muted)]",
                    isCurrent && !isCovered && "ring-2 ring-[var(--color-accent)] ring-offset-1",
                  )}
                />
                {BRANCH_KIND_LABEL[kind]}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}