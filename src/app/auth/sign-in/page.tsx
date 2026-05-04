"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBrowserSupabase } from "@/lib/supabase/client";

function SignInForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/history";

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const supabase = getBrowserSupabase();
  const supabaseConfigured = supabase !== null;

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setStatus("idle");
    setErrMsg(null);
    try {
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (!supabase) return;
    setBusy(true);
    try {
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl },
      });
      if (error) throw error;
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="self-start -ml-3 text-[var(--color-fg-muted)]"
        >
          <ArrowLeft className="size-4" /> 返回首页
        </Button>

        <Card className="glass-card-elevated">
          <CardHeader>
            <CardTitle className="font-serif text-2xl text-[var(--color-fg)]">
              登录辩思
            </CardTitle>
            <p className="text-sm text-[var(--color-fg-muted)] font-sans">
              登录后保存你的&ldquo;思考轨迹&rdquo;，可以随时回顾每一次拷问。
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!supabaseConfigured ? (
              <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-sm text-[var(--color-fg-muted)]">
                <AlertCircle className="size-4 shrink-0 text-[var(--color-accent)]" />
                <div>
                  Supabase 未配置 (开发模式)。设置 <code className="px-1 bg-[var(--color-border)]/50 rounded text-[12px]">NEXT_PUBLIC_SUPABASE_URL</code> 和 <code className="px-1 bg-[var(--color-border)]/50 rounded text-[12px]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 后即可启用登录。
                </div>
              </div>
            ) : (
              <>
                <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
                  <label className="text-xs font-sans text-[var(--color-fg-muted)] uppercase tracking-wide">
                    邮箱
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="px-3 py-2 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-bg-card)] font-sans text-sm focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <Button type="submit" disabled={busy} className="w-full">
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Mail className="size-4" />
                    )}
                    发送 Magic Link
                  </Button>
                </form>

                <div className="flex items-center gap-2 text-xs text-[var(--color-fg-muted)] font-sans">
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                  <span>或</span>
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                </div>

                <Button
                  variant="outline"
                  onClick={handleGoogle}
                  disabled={busy}
                  className="w-full"
                >
                  使用 Google 登录
                </Button>

                {status === "sent" && (
                  <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-[var(--scene-social-1)]/30 bg-[var(--scene-social-1)]/10 p-3 text-sm text-[var(--color-fg)]">
                    <CheckCircle2 className="size-4 shrink-0 text-[var(--scene-social-1)]" />
                    Magic Link 已发送至 {email}，请查收邮件。
                  </div>
                )}
                {status === "error" && errMsg && (
                  <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-3 text-sm text-[var(--color-fg)]">
                    <AlertCircle className="size-4 shrink-0 text-[var(--color-accent)]" />
                    {errMsg}
                  </div>
                )}
              </>
            )}

            <p className="text-xs text-[var(--color-fg-muted)] font-sans">
              没有账号？Magic Link 会自动为你创建一个。
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[var(--color-fg-muted)] font-sans">
          想先匿名体验？<Link href="/" className="underline">回到首页</Link> 直接选场景即可。
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <Loader2 className="size-5 animate-spin text-[var(--color-fg-muted)]" />
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
