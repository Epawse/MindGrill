"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, AlertCircle, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code: "访问码无效，请检查后重试",
  code_invalid: "访问码已失效，请重新输入",
};

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const nextParam = searchParams.get("next");

  // Compute initial error from URL param synchronously — no effect needed.
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam && ERROR_MESSAGES[errorParam] ? ERROR_MESSAGES[errorParam] : null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setError("请输入访问码");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/access-codes/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? "访问码验证失败");
        return;
      }

      // Success — redirect to original page or home.
      router.push(nextParam || "/");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="size-16 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center">
          <KeyRound className="size-8 text-[var(--color-accent)]" />
        </div>
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--color-fg)] mb-2">
            输入访问码
          </h1>
          <p className="font-sans text-sm text-[var(--color-fg-muted)]">
            请输入评审访问码以使用辩思 MindGrill
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            placeholder="MG-JUDGE-XXXXXXXXXXXX"
            className="font-mono text-center text-lg h-12"
            disabled={loading}
            autoFocus
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 font-sans">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full h-11"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              验证中...
            </>
          ) : (
            "验证"
          )}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-3 text-sm font-sans text-[var(--color-fg-muted)]">
        <Link
          href="/auth/sign-in"
          className="hover:text-[var(--color-fg)] transition-colors underline-offset-4 hover:underline"
        >
          已有账号？登录后无需访问码
        </Link>
      </div>

      <Badge variant="outline" className="font-sans text-xs">
        PCG 校园 AI 创意大赛 2026
      </Badge>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-8">
      <Suspense>
        <VerifyForm />
      </Suspense>
    </main>
  );
}