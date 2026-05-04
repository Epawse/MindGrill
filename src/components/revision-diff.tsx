"use client";

/**
 * Side-by-side word-level diff between the user's original draft and the
 * AI-revised draft. Uses the `diff` npm package's `diffWordsWithSpace` for
 * Chinese-friendly tokenization (it preserves whitespace which keeps line
 * structure intact for serif rendering).
 *
 * Both columns scroll independently on small viewports and lock to a 2-col
 * grid on `md+`. Sticky headers keep "原稿" / "拷问后改稿" labels visible while
 * the user scans long drafts.
 */
import { useMemo } from "react";
import { diffWordsWithSpace, type Change } from "diff";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevisionDiffProps {
  original: string;
  revised: string;
}

interface DiffSegment {
  text: string;
  added: boolean;
  removed: boolean;
}

function toSegments(changes: Change[]): {
  left: DiffSegment[];
  right: DiffSegment[];
} {
  const left: DiffSegment[] = [];
  const right: DiffSegment[] = [];
  for (const change of changes) {
    const seg: DiffSegment = {
      text: change.value,
      added: !!change.added,
      removed: !!change.removed,
    };
    if (change.added) {
      // Only appears in revised
      right.push(seg);
    } else if (change.removed) {
      // Only appears in original
      left.push(seg);
    } else {
      // Common to both
      left.push({ ...seg, added: false, removed: false });
      right.push({ ...seg, added: false, removed: false });
    }
  }
  return { left, right };
}

function renderSegment(seg: DiffSegment, idx: number) {
  if (seg.removed) {
    return (
      <span
        key={idx}
        className="bg-[var(--color-fg-muted)]/20 text-[var(--color-fg-muted)] line-through decoration-[var(--color-fg-muted)]/60"
      >
        {seg.text}
      </span>
    );
  }
  if (seg.added) {
    return (
      <span
        key={idx}
        className="bg-[color-mix(in_srgb,var(--scene-thesis-1)_22%,transparent)] text-[var(--color-fg)] rounded-[3px] px-[1px]"
      >
        {seg.text}
      </span>
    );
  }
  return (
    <span key={idx} className="text-[var(--color-fg)]">
      {seg.text}
    </span>
  );
}

export function RevisionDiff({ original, revised }: RevisionDiffProps) {
  const { left, right } = useMemo(() => {
    const changes = diffWordsWithSpace(original, revised);
    return toSegments(changes);
  }, [original, revised]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="glass-card overflow-hidden">
        <CardHeader className="sticky top-0 z-10 bg-[var(--color-bg-card)] backdrop-blur-[var(--glass-blur)] border-b border-[var(--color-border)]">
          <CardTitle className="font-serif text-lg text-[var(--color-fg-muted)]">
            原稿
          </CardTitle>
        </CardHeader>
        <CardContent className="font-serif leading-relaxed whitespace-pre-wrap text-[15px]">
          {left.length === 0 ? (
            <span className="text-[var(--color-fg-muted)]">（空稿）</span>
          ) : (
            left.map(renderSegment)
          )}
        </CardContent>
      </Card>

      <Card className="glass-card-elevated overflow-hidden border-[var(--color-accent)]/30">
        <CardHeader className="sticky top-0 z-10 bg-[var(--color-bg-card)] backdrop-blur-[var(--glass-blur)] border-b border-[var(--color-border)]">
          <CardTitle className="font-serif text-lg text-[var(--color-accent)]">
            拷问后改稿
          </CardTitle>
        </CardHeader>
        <CardContent className="font-serif leading-relaxed whitespace-pre-wrap text-[15px]">
          {right.length === 0 ? (
            <span className="text-[var(--color-fg-muted)]">（空稿）</span>
          ) : (
            right.map(renderSegment)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
