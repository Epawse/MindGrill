"use client";

import { useMemo, useState, use } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  EnginePhase,
  type GrillQuestion,
  type GrillSession,
  type Revision,
  SCENARIO_IDS,
  type ScenarioId,
  type UserAnswer,
} from "@/lib/schemas/grill";
import { resolvedCount, visitedCount } from "@/lib/engine";
import { DraftIntake } from "@/components/draft-intake";
import { QuestionRenderer } from "@/components/question-renderer";
import { ProgressIndicator } from "@/components/progress-indicator";
import { StreakLoader } from "@/components/streak-loader";
import { RevisionSummary } from "@/components/revision-summary";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGrillStore } from "@/stores/grill-store";

type Phase = "INTAKE" | "GRILLING" | "THINKING" | "COMPLETE" | "ERROR";

interface AnswerResponse {
  session: GrillSession;
  question?: GrillQuestion;
  complete?: boolean;
  revisedDraft?: string;
  revision?: Revision;
}

interface StartResponse {
  session: GrillSession;
  question: GrillQuestion;
}

const SCENARIO_TITLES: Record<ScenarioId, string> = {
  thesis: "论文开题",
  resume: "简历投递",
  social: "公众号写作",
};

const SCENARIO_PLACEHOLDERS: Record<ScenarioId, string> = {
  thesis: "粘贴你的论文开题段落，例如：研究问题、核心论点、初步假设…",
  resume: "粘贴你的项目经历段落，例如：『负责后端 API，提升性能 30%』…",
  social: "粘贴你的公众号草稿开头几段，包含你想表达的核心想法。",
};

export default function GrillPage({
  params,
}: {
  params: Promise<{ scenario: string }>;
}) {
  const { scenario: rawScenario } = use(params);
  if (!isScenarioId(rawScenario)) notFound();
  const scenario = rawScenario as ScenarioId;

  const router = useRouter();
  const store = useGrillStore();

  // Transient UI overrides (THINKING during in-flight LLM calls, ERROR on
  // failure, INTAKE forced after reset). When null we fall back to a state
  // derived from the persisted Zustand store, which means hydration races
  // resolve themselves on the next render — no setState-in-effect dance.
  const [transient, setTransient] = useState<
    "THINKING" | "ERROR" | "INTAKE" | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const basePhase: Phase = useMemo(() => {
    if (store.scenario !== scenario || !store.session) return "INTAKE";
    if (store.status === "complete") return "COMPLETE";
    if (store.lastQuestion) return "GRILLING";
    return "INTAKE";
  }, [
    scenario,
    store.scenario,
    store.session,
    store.status,
    store.lastQuestion,
  ]);

  const phase: Phase = transient ?? basePhase;

  const visited = useMemo(
    () => (store.session ? visitedCount(store.session) : 0),
    [store.session],
  );
  const resolved = useMemo(
    () => (store.session ? resolvedCount(store.session) : 0),
    [store.session],
  );

  async function onIntakeSubmit(draft: string) {
    setBusy(true);
    setErrorMsg(null);
    setTransient("THINKING");
    try {
      const res = await fetch("/api/grill/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario, draft }),
      });
      if (!res.ok) {
        const body = await safeReadError(res);
        throw new Error(body);
      }
      const data = (await res.json()) as StartResponse;
      store.startSession({
        scenario,
        session: data.session,
        question: data.question,
      });
      setTransient(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
      setTransient("ERROR");
    } finally {
      setBusy(false);
    }
  }

  async function onAnswer(answer: UserAnswer) {
    if (!store.session) return;
    setBusy(true);
    setErrorMsg(null);
    store.recordAnswer(answer);
    setTransient("THINKING");
    try {
      const res = await fetch("/api/grill/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session: store.session, answer }),
      });
      if (!res.ok) {
        const body = await safeReadError(res);
        throw new Error(body);
      }
      const data = (await res.json()) as AnswerResponse;
      if (data.complete && data.revision && data.revisedDraft) {
        store.completeWith({
          session: data.session,
          revision: data.revision,
          revisedDraft: data.revisedDraft,
        });
        setTransient(null);
      } else if (data.question) {
        store.setSession(data.session);
        store.recordQuestion(data.question);
        setTransient(null);
      } else {
        // Engine in THINKING but no revision returned — surface as error.
        throw new Error("AI 没有返回有效的下一轮内容");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(message);
      setTransient("ERROR");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    store.reset();
    setTransient("INTAKE");
    setErrorMsg(null);
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 sm:px-8 py-8 sm:py-14">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-3 text-[var(--color-fg-muted)]"
          >
            <Link href="/">
              <ArrowLeft className="size-4" /> 返回首页
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="font-sans text-xs"
              data-scenario={scenario}
            >
              {SCENARIO_TITLES[scenario]}
            </Badge>
            <Badge variant="outline" className="font-sans text-xs">
              {phaseLabel(phase)}
            </Badge>
          </div>
        </header>

        {phase === "INTAKE" && (
          <DraftIntake
            title={`${SCENARIO_TITLES[scenario]} · 粘贴你的草稿`}
            placeholder={SCENARIO_PLACEHOLDERS[scenario]}
            onSubmit={onIntakeSubmit}
            disabled={busy}
          />
        )}

        {phase === "GRILLING" && store.lastQuestion && (
          <div className="flex flex-col gap-4">
            <ProgressIndicator visited={Math.max(visited, resolved)} />
            <QuestionRenderer
              question={store.lastQuestion}
              onSubmit={onAnswer}
              disabled={busy}
            />
          </div>
        )}

        {phase === "THINKING" && (
          <div className="flex flex-col gap-4">
            <ProgressIndicator visited={Math.max(visited, resolved)} />
            <div className="glass-card p-8">
              <StreakLoader label="AI 正在拷问你的下一轮…" />
            </div>
          </div>
        )}

        {phase === "COMPLETE" &&
          store.session &&
          store.revision &&
          store.session.phase === EnginePhase.COMPLETE && (
            <RevisionSummary
              originalDraft={store.session.draft}
              revision={store.revision}
              session={store.session}
              onRestart={reset}
            />
          )}

        {phase === "ERROR" && (
          <ErrorPanel
            message={errorMsg ?? "出错了"}
            onRetry={() => setTransient(null)}
            onReset={() => {
              reset();
              router.refresh();
            }}
          />
        )}
      </div>
    </main>
  );
}

function isScenarioId(id: string): id is ScenarioId {
  return (SCENARIO_IDS as readonly string[]).includes(id);
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case "INTAKE":
      return "粘草稿";
    case "GRILLING":
      return "拷问中";
    case "THINKING":
      return "AI 思考";
    case "COMPLETE":
      return "已完成";
    case "ERROR":
      return "出错";
  }
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    return json.error?.message ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

function ErrorPanel({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <section className="glass-card p-6 sm:p-8 flex flex-col gap-4 border-[var(--color-accent)]/40">
      <h2 className="font-serif text-2xl text-[var(--color-fg)]">出错了</h2>
      <p className="text-sm text-[var(--color-fg-muted)] font-sans">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onReset}>
          重置会话
        </Button>
        <Button onClick={onRetry}>再试一次</Button>
      </div>
    </section>
  );
}
