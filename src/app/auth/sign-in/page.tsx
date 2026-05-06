"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Step = "email" | "otp";
type AuthMode = "otp" | "password";

function SignInForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/";

  const [step, setStep] = useState<Step>("email");
  const [authMode, setAuthMode] = useState<AuthMode>("otp");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const supabase = getBrowserSupabase();
  const supabaseConfigured = supabase !== null;

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy(true);
    setErrMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setStep("otp");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !otp.trim()) return;
    setBusy(true);
    setErrMsg(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email",
      });
      if (error) throw error;
      router.push(next);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !email.trim() || !password) return;
    setBusy(true);
    setErrMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      router.push(next);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !email.trim() || !password) return;
    if (password !== confirmPassword) {
      setErrMsg("两次输入的密码不一致");
      return;
    }
    if (password.length < 8) {
      setErrMsg("密码至少 8 位");
      return;
    }
    setBusy(true);
    setErrMsg(null);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      // Auto-confirm for convenience; Supabase may still send verification email
      // depending on project settings. User is redirected immediately.
      router.push(next);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (!supabaseConfigured) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <Card className="glass-card-elevated max-w-md w-full">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">登录不可用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2 text-sm text-[var(--color-fg-muted)]">
              <AlertCircle className="size-4 shrink-0 text-[var(--color-accent)]" />
              <p>
                Supabase 未配置。请联系管理员设置环境变量。
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const isOtpMode = authMode === "otp";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (step === "otp") {
              setStep("email");
              setOtp("");
              setErrMsg(null);
            } else {
              router.push(next || "/");
            }
          }}
          className="self-start -ml-3 text-[var(--color-fg-muted)]"
        >
          <ArrowLeft className="size-4" /> {step === "otp" ? "重新输入邮箱" : "返回"}
        </Button>

        <Card className="glass-card-elevated">
          <CardHeader>
            <CardTitle className="font-serif text-2xl text-[var(--color-fg)]">
              {step === "email"
                ? (!isOtpMode && isSignUp) ? "注册辩思" : "登录辩思"
                : "输入验证码"}
            </CardTitle>
            <p className="text-sm text-[var(--color-fg-muted)] font-sans">
              {step === "email"
                ? (!isOtpMode && isSignUp) ? "创建账号即可开始使用"
                  : isOtpMode ? "验证码会发送到你的邮箱" : "输入邮箱和密码登录"
                : `验证码已发送至 ${email}`}
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Auth mode tabs */}
            {step === "email" && (
              <div className="flex rounded-[var(--radius-button)] border border-[var(--color-border)] overflow-hidden text-sm font-sans">
                <button
                  type="button"
                  onClick={() => { setAuthMode("otp"); setErrMsg(null); setIsSignUp(false); }}
                  className={cn(
                    "flex-1 py-2 text-center transition-colors",
                    isOtpMode
                      ? "bg-[var(--color-accent-bg)] text-[var(--color-fg)] font-medium"
                      : "bg-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
                  )}
                >
                  <Mail className="inline-block size-3.5 mr-1 align-[-2px]" />
                  验证码登录
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("password"); setErrMsg(null); }}
                  className={cn(
                    "flex-1 py-2 text-center transition-colors",
                    !isOtpMode
                      ? "bg-[var(--color-accent-bg)] text-[var(--color-fg)] font-medium"
                      : "bg-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
                  )}
                >
                  <Lock className="inline-block size-3.5 mr-1 align-[-2px]" />
                  密码登录
                </button>
              </div>
            )}

            {/* OTP flow */}
            {step === "email" && isOtpMode && (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
                <label className="text-xs font-sans text-[var(--color-fg-muted)] uppercase tracking-wide">
                  邮箱
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrMsg(null); }}
                  placeholder="you@example.com"
                  disabled={busy}
                  autoFocus
                />
                <Button type="submit" disabled={busy || !email.trim()} className="w-full">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  发送验证码
                </Button>

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
              </form>
            )}

            {/* OTP verification */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
                <label className="text-xs font-sans text-[var(--color-fg-muted)] uppercase tracking-wide">
                  验证码
                </label>
                <Input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value); setErrMsg(null); }}
                  placeholder="输入 6 位验证码"
                  className="font-mono text-center text-2xl tracking-[0.5em] h-14"
                  maxLength={6}
                  disabled={busy}
                  autoFocus
                  inputMode="numeric"
                  pattern="\d{6}"
                />
                <Button type="submit" disabled={busy || otp.trim().length < 6} className="w-full">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  验证登录
                </Button>

                <button
                  type="button"
                  onClick={() => handleSendOtp({ preventDefault: () => {} } as React.FormEvent)}
                  disabled={busy}
                  className="text-xs text-[var(--color-fg-muted)] font-sans hover:text-[var(--color-fg)] transition-colors underline-offset-4 hover:underline text-center"
                >
                  没收到？重新发送验证码
                </button>
              </form>
            )}

            {/* Password flow */}
            {step === "email" && !isOtpMode && (
              <form onSubmit={isSignUp ? handlePasswordSignUp : handlePasswordSignIn} className="flex flex-col gap-3">
                <label className="text-xs font-sans text-[var(--color-fg-muted)] uppercase tracking-wide">
                  邮箱
                </label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrMsg(null); }}
                  placeholder="you@example.com"
                  disabled={busy}
                  autoFocus
                />
                <label className="text-xs font-sans text-[var(--color-fg-muted)] uppercase tracking-wide">
                  密码
                </label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrMsg(null); }}
                  placeholder={isSignUp ? "至少 8 位" : "输入密码"}
                  disabled={busy}
                />
                {isSignUp && (
                  <>
                    <label className="text-xs font-sans text-[var(--color-fg-muted)] uppercase tracking-wide">
                      确认密码
                    </label>
                    <Input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setErrMsg(null); }}
                      placeholder="再次输入密码"
                      disabled={busy}
                    />
                  </>
                )}
                <Button type="submit" disabled={busy || !email.trim() || !password} className="w-full">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                  {isSignUp ? "创建账号" : "登录"}
                </Button>

                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setErrMsg(null); }}
                  className="text-xs text-[var(--color-fg-muted)] font-sans hover:text-[var(--color-fg)] transition-colors underline-offset-4 hover:underline text-center"
                >
                  {isSignUp ? "已有账号？去登录" : "没有账号？去注册"}
                </button>
              </form>
            )}

            {errMsg && (
              <div className="flex items-start gap-2 rounded-[var(--radius-card)] border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 p-3 text-sm text-[var(--color-fg)]">
                <AlertCircle className="size-4 shrink-0 text-[var(--color-accent)]" />
                {errMsg}
              </div>
            )}

            {isOtpMode && step === "email" && (
              <p className="text-xs text-[var(--color-fg-muted)] font-sans">
                没有账号？验证码会自动为你创建账号。
              </p>
            )}
          </CardContent>
        </Card>

        {isOtpMode && step === "email" && (
          <p className="text-center text-xs text-[var(--color-fg-muted)] font-sans">
            想先匿名体验？
            <Link href="/verify" className="underline underline-offset-4 hover:text-[var(--color-fg)] transition-colors">
              输入访问码
            </Link>
          </p>
        )}
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