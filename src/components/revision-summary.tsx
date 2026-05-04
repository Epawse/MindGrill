"use client";

/**
 * Post-grill summary screen.
 *
 * Pass 1.5 stub had only plain old original/revised cards. Pass 2 wires in:
 *   - <RevisionDiff>   — word-level inline diff
 *   - <ThinkingTreeViz>— React Flow decision tree with replay
 *   - <ShareCard>      — 1080² social-share PNG export
 *
 * Falls back gracefully if `session` is missing tree data (defensive) so the
 * page never crashes on a malformed payload.
 */
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RevisionDiff } from "@/components/revision-diff";
import { ThinkingTreeViz } from "@/components/thinking-tree-viz";
import { ShareCard } from "@/components/share-card";
import type { GrillSession, Revision } from "@/lib/schemas/grill";

interface RevisionSummaryProps {
  originalDraft: string;
  revision: Revision;
  session?: GrillSession | null;
  onRestart: () => void;
}

export function RevisionSummary({
  originalDraft,
  revision,
  session,
  onRestart,
}: RevisionSummaryProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <Badge variant="default" className="self-start">
          拷问完成
        </Badge>
        <h2 className="font-serif text-3xl text-[var(--color-fg)] leading-tight">
          你想清楚了，AI 帮你整理了一版改稿。
        </h2>
        <p className="text-sm text-[var(--color-fg-muted)]">
          {revision.summary}
        </p>
      </div>

      <RevisionDiff original={originalDraft} revised={revision.revised_draft} />

      {revision.key_changes.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg">关键改动</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-[var(--color-fg)]">
              {revision.key_changes.map((change, i) => (
                <li key={i}>{change}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {session && session.rootId in session.nodes && (
        <ThinkingTreeViz session={session} />
      )}

      {session && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg">分享你的拷问</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareCard session={session} />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={onRestart}
          className="rounded-[var(--radius-button)]"
        >
          再来一次
        </Button>
      </div>
    </motion.section>
  );
}
