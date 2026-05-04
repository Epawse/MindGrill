"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  visited: number;
  min?: number;
  max?: number;
  className?: string;
}

/**
 * Renders the "已问 N / 目标 5–8 轮" pill with a shadcn Progress underneath.
 * `visited` is the number of resolved+skipped nodes so far.
 */
export function ProgressIndicator({
  visited,
  min = 5,
  max = 8,
  className,
}: ProgressIndicatorProps) {
  const safeVisited = Math.max(0, Math.min(visited, max));
  const pct = Math.round((safeVisited / max) * 100);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-sans text-[var(--color-fg-muted)]">
          已问 <strong className="text-[var(--color-fg)]">{safeVisited}</strong> / 目标 {min}–{max} 轮
        </span>
        <span className="text-xs text-[var(--color-fg-muted)] tabular-nums">
          {pct}%
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}
