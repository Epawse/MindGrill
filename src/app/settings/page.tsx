"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Gift, Info, Sparkles } from "lucide-react";

import { PROVIDERS, type ProviderId } from "@/lib/ai/provider-registry";
import { useProviderHealth } from "@/hooks/use-provider-health";
import { useProviderKeys } from "@/hooks/use-provider-keys";
import { useSubscription, useRedeemCode } from "@/hooks/use-subscription";
import { ProviderCard } from "@/components/settings/provider-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBrowserSupabase } from "@/lib/supabase/client";

function CreditBar({
  remaining,
  total,
  isUnlimited,
}: {
  remaining: number;
  total: number;
  isUnlimited: boolean;
}) {
  if (isUnlimited) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 rounded-full bg-emerald-500/20">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: "100%" }}
          />
        </div>
        <span className="font-sans text-sm font-medium text-emerald-700">
          不限量
        </span>
      </div>
    );
  }

  const pct = total > 0 ? Math.min((remaining / total) * 100, 100) : 0;
  const color =
    pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";
  const trackColor =
    pct > 50
      ? "bg-emerald-500/20"
      : pct > 20
        ? "bg-amber-500/20"
        : "bg-red-500/20";

  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 flex-1 rounded-full ${trackColor}`}>
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-sans text-sm text-[var(--color-fg-muted)] whitespace-nowrap">
        {remaining}/{total}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const { data: healthData } = useProviderHealth();
  const {
    keys,
    loading: keysLoading,
    saveKey,
    testKey,
    deleteKey,
  } = useProviderKeys();
  const { subscription, loading: subLoading, refetch: refetchSub } = useSubscription();
  const { redeem, loading: redeemLoading, error: redeemError, result: redeemResult } = useRedeemCode();
  const [redeemInput, setRedeemInput] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    async function checkAuth() {
      const { data } = await supabase!.auth.getUser();
      setIsLoggedIn(!!data.user);
    }
    void checkAuth();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void checkAuth();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleRedeem() {
    const code = redeemInput.trim();
    if (!code) return;
    const res = await redeem(code);
    if (res) {
      setRedeemInput("");
      refetchSub();
    }
  }

  const healthMap = new Map(
    (healthData?.providers ?? []).map((p) => [p.id, p]),
  );

  const keysByProvider = new Map<ProviderId, typeof keys>();
  for (const k of keys) {
    const existing = keysByProvider.get(k.provider_id) ?? [];
    existing.push(k);
    keysByProvider.set(k.provider_id, existing);
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 sm:px-8 py-8 sm:py-12">
      <div className="w-full max-w-3xl">
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
          设置
        </h1>
        <p className="font-sans text-[var(--color-fg-muted)] mb-8">
          管理你的套餐、额度和 API Key。
        </p>

        {/* Subscription status */}
        <section className="mb-8">
          <h2 className="font-serif text-xl font-semibold text-[var(--color-fg)] mb-4">
            我的套餐
          </h2>

          {subLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-[var(--color-fg-muted)]" />
            </div>
          ) : !isLoggedIn ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="font-sans text-[var(--color-fg-muted)]">
                请先登录查看套餐信息
              </p>
            </div>
          ) : subscription ? (
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[var(--color-fg)]">
                    {subscription.plan_name}
                  </h3>
                  <p className="font-sans text-sm text-[var(--color-fg-muted)]">
                    {subscription.is_unlimited
                      ? "不限量对练"
                      : `每月 ${subscription.monthly_credits} 次对练`}
                  </p>
                </div>
                <Link href="/pricing">
                  <Button variant="outline" size="sm" className="font-sans">
                    升级套餐
                  </Button>
                </Link>
              </div>

              {/* Monthly credits */}
              {!subscription.is_unlimited && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-sans text-sm text-[var(--color-fg-muted)]">
                      本月额度
                    </span>
                    <span className="font-sans text-sm font-medium text-[var(--color-fg)]">
                      {subscription.credits_remaining} 次
                    </span>
                  </div>
                  <CreditBar
                    remaining={subscription.credits_remaining}
                    total={subscription.monthly_credits}
                    isUnlimited={false}
                  />
                </div>
              )}

              {/* Bonus credits */}
              {subscription.bonus_credits_remaining > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <Gift className="size-4 text-amber-600 shrink-0" />
                  <span className="font-sans text-sm text-amber-700">
                    兑换码额度：{subscription.bonus_credits_remaining} 次
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="font-sans text-[var(--color-fg-muted)] mb-4">
                还没有套餐信息
              </p>
              <Link href="/pricing">
                <Button className="font-sans">选择套餐</Button>
              </Link>
            </div>
          )}
        </section>

        {/* Redeem code */}
        {isLoggedIn && (
          <section className="mb-8">
            <h2 className="font-serif text-xl font-semibold text-[var(--color-fg)] mb-4">
              兑换码
            </h2>
            <div className="glass-card rounded-2xl p-6">
              <div className="flex gap-2">
                <Input
                  placeholder="输入兑换码（如 MG-REDEEM-XXXXXXXXXXXX）"
                  value={redeemInput}
                  onChange={(e) => setRedeemInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleRedeem();
                  }}
                  className="font-mono font-sans"
                />
                <Button
                  onClick={() => void handleRedeem()}
                  disabled={redeemLoading || !redeemInput.trim()}
                  className="font-sans shrink-0"
                >
                  {redeemLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "兑换"
                  )}
                </Button>
              </div>
              {redeemResult && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                  <Sparkles className="size-4 text-emerald-600 shrink-0" />
                  <span className="font-sans text-sm text-emerald-700">
                    兑换成功！获得 {redeemResult.credits_granted} 次额度
                  </span>
                </div>
              )}
              {redeemError && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                  <Info className="size-4 text-red-600 shrink-0" />
                  <span className="font-sans text-sm text-red-700">
                    {redeemError}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Provider keys */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-serif text-xl font-semibold text-[var(--color-fg)]">
              供应商配置
            </h2>
            <div className="group relative">
              <Info className="size-4 text-[var(--color-fg-muted)] cursor-help" />
              <div className="absolute left-0 top-6 z-10 hidden group-hover:block w-64 rounded-lg border border-[var(--color-border-warm)] bg-white p-3 shadow-lg font-sans text-xs text-[var(--color-fg-muted)]">
                配置自己的 API Key 后，对练不会消耗平台额度。你只需要为你使用的 API 付费。
              </div>
            </div>
          </div>
          <p className="font-sans text-sm text-[var(--color-fg-muted)] mb-4">
            配置你自己的 LLM API Key，使用自己的 Key 不会消耗平台额度。
            {!isLoggedIn && (
              <span className="text-[var(--color-accent)]"> 请先登录。</span>
            )}
          </p>

          <div className="space-y-3">
            {PROVIDERS.map((meta) => (
              <ProviderCard
                key={meta.id}
                meta={meta}
                storedKeys={keysByProvider.get(meta.id) ?? []}
                isLoggedIn={isLoggedIn}
                onSave={async (providerId, apiKey, baseUrl) => {
                  await saveKey(providerId, apiKey, baseUrl);
                }}
                onTest={async (providerId, apiKey, baseUrl) => {
                  return await testKey(providerId, apiKey, baseUrl);
                }}
                onDelete={async (id) => {
                  return await deleteKey(id);
                }}
                envConfigured={healthMap.get(meta.id)?.configured ?? false}
                envKeyCount={healthMap.get(meta.id)?.keyCount ?? 0}
              />
            ))}
          </div>

          {keysLoading && (
            <p className="font-sans text-sm text-[var(--color-fg-muted)] mt-4 text-center">
              加载中...
            </p>
          )}
        </section>
      </div>
    </main>
  );
}