"use client";

/**
 * ShareCard — exports a 1080×1080 social-share square summarizing the user's
 * grill session. Uses `html-to-image` (toPng) on a hidden offscreen card.
 *
 * The card is rendered absolutely-positioned offscreen so the user can't see
 * it but `html-to-image` can. On "导出图片" we run `toPng` and trigger a
 * download; on "复制链接" we copy a one-line slogan to clipboard (Web Share API
 * is opt-in via the navigator.share path when available).
 */
import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Download, Loader2, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  NodeStatus,
  SCENARIO_LABEL,
  type GrillSession,
  type ScenarioId,
} from "@/lib/schemas/grill";
import { logger } from "@/lib/logger";

interface ShareCardProps {
  session: GrillSession;
}

const SCENARIO_GRADIENT: Record<ScenarioId, [string, string]> = {
  thesis: ["#667eea", "#764ba2"],
  resume: ["#F59E0B", "#EF4444"],
  social: ["#10B981", "#6366F1"],
};

function formatTime(ts: number | null): string {
  if (ts === null) return "—";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ShareCard({ session }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const resolvedCount = Object.values(session.nodes).filter(
    (n) => n.status === NodeStatus.RESOLVED,
  ).length;
  const skippedCount = Object.values(session.nodes).filter(
    (n) => n.status === NodeStatus.SKIPPED,
  ).length;
  const totalRounds = resolvedCount + skippedCount;

  const [grad0, grad1] = SCENARIO_GRADIENT[session.scenario];

  const onDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#F0EEE6",
      });
      const link = document.createElement("a");
      link.download = `mindgrill-${session.scenario}-${session.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      logger.error("share-card export failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }, [session.scenario, session.id]);

  const onCopy = useCallback(async () => {
    const text = `我用辩思 (MindGrill) 走了 ${totalRounds} 轮 AI 反向拷问，从模糊到清晰。`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "辩思 · MindGrill",
          text,
          url: typeof window !== "undefined" ? window.location.origin : undefined,
        });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // user dismissed
    }
  }, [totalRounds]);

  // Sample up to 6 most-recently resolved node labels for the card.
  const nodeBubbles = Object.values(session.nodes)
    .filter((n) => n.status === NodeStatus.RESOLVED)
    .sort(
      (a, b) =>
        (a.resolvedAt ?? a.createdAt) - (b.resolvedAt ?? b.createdAt),
    )
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button onClick={onDownload} disabled={busy}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          导出图片
        </Button>
        <Button variant="outline" onClick={onCopy}>
          <Share2 className="size-4" />
          {copied ? "已复制 / 已分享" : "分享一句话"}
        </Button>
      </div>

      {/* Offscreen render target. Kept in normal flow but visually isolated
          via fixed positioning + pointer-events-none + opacity 0 so users
          don't see it but html-to-image can paint it. */}
      <div
        aria-hidden
        className="fixed pointer-events-none"
        style={{
          top: 0,
          left: 0,
          opacity: 0,
          zIndex: -1,
          width: 1080,
          height: 1080,
        }}
      >
        <div
          ref={cardRef}
          style={{
            width: 1080,
            height: 1080,
            background: "#F0EEE6",
            padding: 72,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontFamily:
              "'Source Han Serif CN VF','Tiempos Text','Noto Serif SC','Songti SC',serif",
            color: "#2C2A26",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* corner gradient accent */}
          <div
            style={{
              position: "absolute",
              top: -200,
              right: -200,
              width: 520,
              height: 520,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${grad0} 0%, ${grad1} 70%, transparent 100%)`,
              opacity: 0.55,
              filter: "blur(40px)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontSize: 40,
                letterSpacing: 4,
                color: "#C15F3C",
                fontWeight: 600,
              }}
            >
              辩思 · MindGrill
            </div>
            <div
              style={{
                marginTop: 12,
                fontFamily: "'Inter Variable',system-ui,sans-serif",
                fontSize: 20,
                color: "#B1ADA1",
              }}
            >
              AI 不帮你写，帮你想清楚 — {SCENARIO_LABEL[session.scenario]}
            </div>
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 96, lineHeight: 1.1, fontWeight: 600 }}>
              {totalRounds} 轮拷问
            </div>
            <div style={{ fontSize: 32, marginTop: 14, color: "#2C2A26" }}>
              从模糊 → 清晰
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 36,
                maxWidth: 900,
              }}
            >
              {nodeBubbles.map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 9999,
                    background:
                      i === 0 || i === nodeBubbles.length - 1
                        ? `linear-gradient(135deg, ${grad0}, ${grad1})`
                        : "rgba(255,255,255,0.6)",
                    color: i === 0 || i === nodeBubbles.length - 1 ? "#fff" : "#2C2A26",
                    fontSize: 20,
                    border:
                      i === 0 || i === nodeBubbles.length - 1
                        ? "none"
                        : "1px solid rgba(0,0,0,0.06)",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  {n.label}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              fontFamily: "'Inter Variable',system-ui,sans-serif",
              fontSize: 18,
              color: "#B1ADA1",
            }}
          >
            <div>
              <div>{formatTime(session.completedAt ?? session.updatedAt)}</div>
              <div style={{ marginTop: 6 }}>
                反工具化 AI 写作教练 · 决策树拷问
              </div>
            </div>
            <div
              style={{
                fontFamily:
                  "'Source Han Serif CN VF','Tiempos Text',serif",
                fontSize: 28,
                color: "#C15F3C",
              }}
            >
              辩思
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
