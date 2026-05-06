"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle } from "lucide-react";

import { SceneCard } from "@/components/scene-card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserHeader } from "@/components/user-header";
import { useProviderHealth } from "@/hooks/use-provider-health";

const SCENARIOS = [
  {
    id: "thesis" as const,
    title: "Thesis",
    zhTitle: "论文开题",
    oneLiner: "把模糊的论点拷问到能站住脚",
    description:
      "AI 扮演严谨学术导师，按论点 / 证据 / 反驳 / 修正逐节点追问，直到论文经得起同行审视。",
    gradientClass: "scene-gradient-thesis",
  },
  {
    id: "resume" as const,
    title: "Resume",
    zhTitle: "简历投递",
    oneLiner: "把项目细节拷问到能打动 HR",
    description:
      "AI 站在 HR 视角追问 STAR 结构与可量化成果，让你的项目经历不再是“参与了”。",
    gradientClass: "scene-gradient-resume",
  },
  {
    id: "social" as const,
    title: "Social",
    zhTitle: "公众号写作",
    oneLiner: "把模糊想法拷问到读者愿意往下读",
    description:
      "AI 化身资深内容编辑，反复追问钩子、节奏、读者代入，避免空洞情绪与套话。",
    gradientClass: "scene-gradient-social",
  },
];

export default function Home() {
  const { data, loading } = useProviderHealth();
  const anyConfigured = data?.anyConfigured ?? false;
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 sm:px-8 py-12 sm:py-20">
      <div className="w-full max-w-5xl flex justify-end mb-6">
        <UserHeader />
      </div>
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl flex flex-col gap-6 mb-12 sm:mb-16"
      >
        <Badge variant="outline" className="self-start font-sans">
          PCG 校园 AI 创意大赛 2026 · 开放赛道
        </Badge>
        <h1 className="font-serif text-4xl sm:text-6xl font-semibold leading-[1.1] text-[var(--color-fg)]">
          辩思 <span className="text-[var(--color-accent)]">MindGrill</span>
        </h1>
        <p className="font-serif text-2xl sm:text-3xl leading-snug text-[var(--color-fg)] max-w-3xl">
          AI 不帮你写，<span className="text-[var(--color-accent)]">帮你想清楚</span>。
        </p>
        <p className="font-sans text-base sm:text-lg text-[var(--color-fg-muted)] max-w-2xl leading-relaxed">
          不替你写，只替你问。AI 沿论点→证据→反驳→修正的决策树循环追问，每一轮给出推荐答案和备选路径，6–8 轮后帮你生成一版信息密度更高的改稿。
        </p>
        <ProviderBadge loading={loading} configured={anyConfigured} />
      </motion.header>

      <section
        aria-label="选择写作场景"
        className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {SCENARIOS.map((s) => (
          <SceneCard
            key={s.id}
            scenarioId={s.id}
            title={s.title}
            zhTitle={s.zhTitle}
            oneLiner={s.oneLiner}
            description={s.description}
            gradientClass={s.gradientClass}
            href={`/grill/${s.id}`}
            disabled={!loading && !anyConfigured}
            onDisabledClick={() => setShowConfigDialog(true)}
          />
        ))}
      </section>

      <footer className="w-full max-w-5xl mt-16 text-xs text-[var(--color-fg-muted)] font-sans">
        © 2026 辩思 MindGrill — 反工具化 AI 写作教练
      </footer>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl flex items-center gap-2">
              <AlertTriangle className="size-5 text-[var(--color-accent)]" />
              请先配置 AI 提供商
            </DialogTitle>
            <DialogDescription className="text-[var(--color-fg-muted)] font-sans">
              当前环境下没有检测到任何已配置的 LLM 供应商 key。请在项目根目录复制
              <code className="font-mono mx-1 px-1.5 py-0.5 rounded bg-[var(--color-bg-pampas)]">
                .env.local.example
              </code>
              为 <code className="font-mono mx-1 px-1.5 py-0.5 rounded bg-[var(--color-bg-pampas)]">.env.local</code>，
              并至少填入以下任意一个 API key：
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc pl-5 text-sm font-mono space-y-1">
            <li>OLLAMA_API_KEY（实测主选）</li>
            <li>GOOGLE_GENERATIVE_AI_API_KEY</li>
            <li>OPENAI_API_KEY</li>
            <li>ANTHROPIC_API_KEY</li>
          </ul>
          <DialogFooter>
            <Button onClick={() => setShowConfigDialog(false)}>知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ProviderBadge({
  loading,
  configured,
}: {
  loading: boolean;
  configured: boolean;
}) {
  if (loading) {
    return (
      <Badge variant="outline" className="self-start font-sans gap-1">
        正在检测 LLM 提供商…
      </Badge>
    );
  }
  if (!configured) {
    return (
      <Badge
        variant="destructive"
        className="self-start font-sans gap-1 bg-[var(--color-accent)]"
      >
        <AlertTriangle className="size-3" /> 未检测到任何 LLM 提供商
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="self-start font-sans gap-1 border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
    >
      <CheckCircle2 className="size-3" /> AI 提供商已就绪
    </Badge>
  );
}
