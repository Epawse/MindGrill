"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription, type PlanInfo } from "@/hooks/use-subscription";

function formatPrice(cents: number): string {
  if (cents === 0) return "免费";
  return `¥${(cents / 100).toFixed(0)}`;
}

function formatCredits(credits: number): string {
  if (credits === -1) return "不限量";
  if (credits === 0) return "暂无额度";
  return `${credits} 次`;
}

function formatMaxRounds(rounds: number): string {
  if (rounds === 0) return "无限制";
  return `${rounds} 轮`;
}

const MODEL_ACCESS_LABELS: Record<string, string> = {
  basic: "基础模型",
  advanced: "高级模型",
  all: "全部模型",
};

function PlanCard({
  plan,
  isCurrent,
  isYearly,
  onSubscribe,
  subscribing,
}: {
  plan: PlanInfo;
  isCurrent: boolean;
  isYearly: boolean;
  onSubscribe: (planId: string) => void;
  subscribing: boolean;
}) {
  const price = isYearly ? plan.price_yearly : plan.price_monthly;
  const periodLabel = isYearly ? "/年" : "/月";
  const isFree = plan.id === "free";
  const isPro = plan.id === "pro";

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl border p-6
        ${
          isPro
            ? "border-[var(--color-accent)] bg-white/90 shadow-[var(--glass-shadow-elevated)]"
            : "border-[var(--color-border-warm)] bg-white/70 shadow-[var(--glass-shadow)]"
        }
      `}
    >
      {isPro && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]">
          推荐
        </Badge>
      )}

      <h3 className="font-serif text-2xl font-semibold text-[var(--color-fg)]">
        {plan.name}
      </h3>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-sans text-4xl font-bold text-[var(--color-fg)]">
          {isFree ? "免费" : formatPrice(price)}
        </span>
        {!isFree && (
          <span className="font-sans text-sm text-[var(--color-fg-muted)]">
            {periodLabel}
          </span>
        )}
      </div>

      {isYearly && !isFree && (
        <p className="mt-1 font-sans text-xs text-emerald-600">
          相当于每月 {formatPrice(Math.round(plan.price_yearly / 10 / 100) * 100)}
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-3 font-sans text-sm text-[var(--color-fg)]">
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>每月 {formatCredits(plan.monthly_credits)} 对练</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>每场最多 {formatMaxRounds(plan.max_rounds)}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>{MODEL_ACCESS_LABELS[plan.model_access] ?? plan.model_access}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>自带 API Key 不消耗额度</span>
        </li>
      </ul>

      <div className="mt-auto pt-6">
        {isCurrent ? (
          <Button variant="outline" className="w-full font-sans" disabled>
            当前套餐
          </Button>
        ) : isFree ? (
          <Button variant="outline" className="w-full font-sans" disabled>
            默认套餐
          </Button>
        ) : (
          <Button
            className="w-full font-sans"
            variant={isPro ? "default" : "outline"}
            onClick={() => onSubscribe(plan.id)}
            disabled={subscribing}
          >
            {subscribing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            升级到 {plan.name}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { plans, subscription, loading } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleSubscribe(planId: string) {
    // Simulated payment for now
    setSubscribing(planId);
    // Simulate a delay for the "payment" process
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setShowSuccess(true);
    setSubscribing(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        <Loader2 className="size-8 animate-spin text-[var(--color-fg-muted)]" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 sm:px-8 py-8 sm:py-12">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" size="sm" className="font-sans">
            <Link href="/">
              <ArrowLeft className="size-4" />
              返回首页
            </Link>
          </Button>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--color-fg)] mb-2">
          选择套餐
        </h1>
        <p className="font-sans text-[var(--color-fg-muted)] mb-8">
          自带 API Key 不消耗平台额度，适合有自己 Key 的用户。
        </p>

        {/* Billing toggle */}
        <div className="flex items-center gap-3 mb-8 font-sans text-sm">
          <button
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              !isYearly
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            }`}
            onClick={() => setIsYearly(false)}
          >
            月付
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              isYearly
                ? "bg-[var(--color-accent)] text-white"
                : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            }`}
            onClick={() => setIsYearly(true)}
          >
            年付（10 个月价）
          </button>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={subscription?.plan_id === plan.id}
              isYearly={isYearly}
              onSubscribe={handleSubscribe}
              subscribing={subscribing === plan.id}
            />
          ))}
        </div>

        {/* Simulated payment success */}
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="glass-card-elevated rounded-2xl p-8 max-w-md mx-4 text-center">
              <h2 className="font-serif text-2xl font-semibold text-[var(--color-fg)] mb-2">
                支付成功（模拟）
              </h2>
              <p className="font-sans text-[var(--color-fg-muted)] mb-6">
                这是模拟支付流程。正式上线后将接入真实支付。
              </p>
              <Button
                className="font-sans"
                onClick={() => setShowSuccess(false)}
              >
                知道了
              </Button>
            </div>
          </div>
        )}

        {/* Redeem code link */}
        <div className="mt-8 text-center font-sans text-sm text-[var(--color-fg-muted)]">
          有兑换码？{" "}
          <Link
            href="/settings"
            className="text-[var(--color-accent)] hover:underline"
          >
            在设置中输入
          </Link>
        </div>
      </div>
    </main>
  );
}