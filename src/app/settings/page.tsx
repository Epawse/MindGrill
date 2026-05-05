"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PROVIDERS, type ProviderId } from "@/lib/ai/provider-registry";
import { useProviderHealth } from "@/hooks/use-provider-health";
import { useProviderKeys } from "@/hooks/use-provider-keys";
import { ProviderCard } from "@/components/settings/provider-card";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { data: healthData } = useProviderHealth();
  const {
    keys,
    loading: keysLoading,
    saveKey,
    testKey,
    deleteKey,
  } = useProviderKeys();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    async function checkAuth() {
      const {
        data: { user },
      } = await supabase!.auth.getUser();
      setIsLoggedIn(!!user);
    }
    void checkAuth();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void checkAuth();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // Build a map of provider health status
  const healthMap = new Map(
    (healthData?.providers ?? []).map((p) => [p.id, p]),
  );

  // Group stored keys by provider
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
          供应商配置
        </h1>
        <p className="font-sans text-[var(--color-fg-muted)] mb-8">
          配置你的 LLM API Key，优先使用自定义 Key 覆盖服务器默认配置。
          {!isLoggedIn && (
            <span className="text-[var(--color-accent)]"> 请先登录。</span>
          )}
        </p>

        {/* Provider cards */}
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
      </div>
    </main>
  );
}