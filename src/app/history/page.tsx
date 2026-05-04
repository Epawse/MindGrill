import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, FileText, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getServerUser } from "@/lib/auth/get-user";
import { listSessions, type PersistedSession } from "@/lib/supabase/sessions";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { type ScenarioId, SCENARIO_LABEL } from "@/lib/schemas/grill";

const SCENARIO_ICON: Record<ScenarioId, typeof BookOpen> = {
  thesis: BookOpen,
  resume: FileText,
  social: Sparkles,
};

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return d.toISOString().slice(0, 10);
}

function excerpt(text: string, max = 80): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max) + "…";
}

export default async function HistoryPage() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <Card className="glass-card max-w-md">
          <CardHeader>
            <CardTitle className="font-serif text-xl">未配置历史记录</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-fg-muted)] flex flex-col gap-3">
            <p>
              要保存&ldquo;我的拷问历史&rdquo;，请先配置 Supabase: 在 <code className="px-1 bg-[var(--color-border)]/50 rounded text-[12px]">.env.local</code> 中设置
              <code className="px-1 bg-[var(--color-border)]/50 rounded text-[12px]">NEXT_PUBLIC_SUPABASE_URL</code> 和
              <code className="px-1 bg-[var(--color-border)]/50 rounded text-[12px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>。
            </p>
            <Button asChild variant="outline">
              <Link href="/"><ArrowLeft className="size-4" /> 返回首页</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const user = await getServerUser();
  if (!user) {
    redirect("/auth/sign-in?next=/history");
  }

  const sessions = await listSessions();

  return (
    <main className="min-h-screen flex flex-col items-center px-4 sm:px-8 py-8 sm:py-14">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="-ml-3 text-[var(--color-fg-muted)]">
            <Link href="/"><ArrowLeft className="size-4" /> 返回首页</Link>
          </Button>
          <form action="/auth/sign-out" method="post">
            <Button variant="ghost" size="sm" type="submit">
              登出
            </Button>
          </form>
        </header>

        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-3xl text-[var(--color-fg)]">
            我的拷问历史
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)]">
            {user.profile.display_name ?? user.user.email} · 共 {sessions.length} 次拷问
          </p>
        </div>

        {sessions.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
              <p className="font-serif text-lg text-[var(--color-fg)]">
                你还没有拷问记录。
              </p>
              <p className="text-sm text-[var(--color-fg-muted)]">
                选一个场景，把草稿粘上去，让 AI 拷问你想清楚。
              </p>
              <Button asChild>
                <Link href="/">立刻开始</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((s) => {
              const scenario = s.scenario as ScenarioId;
              const Icon = SCENARIO_ICON[scenario];
              return (
                <Link
                  key={s.id}
                  href={`/history/${s.id}`}
                  className="glass-card p-4 flex items-start gap-3 hover:border-[var(--color-accent)]/40 transition-colors"
                >
                  <div className="mt-1 size-8 rounded-[var(--radius-button)] bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-fg-muted)]">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-sans">
                        {SCENARIO_LABEL[scenario]}
                      </Badge>
                      <Badge
                        variant={s.status === "complete" ? "default" : "outline"}
                        className="text-xs font-sans"
                      >
                        {s.status === "complete" ? "已完成" : "进行中"}
                      </Badge>
                      <span className="text-xs text-[var(--color-fg-muted)] ml-auto">
                        {relativeTime(s.updated_at)}
                      </span>
                    </div>
                    <p className="font-serif text-sm text-[var(--color-fg)] line-clamp-2">
                      {excerpt(s.draft, 120)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";

export type { PersistedSession };
