"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Ban, Plus, Loader2, AlertCircle, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RedeemCodeRow {
  id: string;
  code: string;
  credits: number;
  max_uses: number;
  used_count: number;
  expires_at: string;
  note: string | null;
  revoked: boolean;
  created_by: string | null;
  created_at: string;
}

interface SubscriptionRow {
  id: string;
  user_id: string;
  plan_id: string;
  credits_remaining: number;
  credits_used: number;
  status: string;
  bonus_credits: number;
  bonus_credits_used: number;
  plan: {
    id: string;
    name: string;
    monthly_credits: number;
  };
}

type Tab = "codes" | "subscriptions";

function getDefaultExpiry(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 16);
}

function getStatusBadge(code: RedeemCodeRow) {
  if (code.revoked) {
    return <Badge variant="destructive">已吊销</Badge>;
  }
  if (new Date(code.expires_at) <= new Date()) {
    return <Badge variant="secondary">已过期</Badge>;
  }
  if (code.used_count >= code.max_uses) {
    return <Badge variant="outline">已用完</Badge>;
  }
  return (
    <Badge className="border-emerald-500/40 text-emerald-700 bg-emerald-500/10">
      有效
    </Badge>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("codes");
  const [codes, setCodes] = useState<RedeemCodeRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [createCount, setCreateCount] = useState(1);
  const [createCredits, setCreateCredits] = useState(50);
  const [createMaxUses, setCreateMaxUses] = useState(1);
  const [createExpiry, setCreateExpiry] = useState(getDefaultExpiry());
  const [createNote, setCreateNote] = useState("");
  const [creating, setCreating] = useState(false);

  // Upgrade form state
  const [upgradeUserId, setUpgradeUserId] = useState("");
  const [upgradePlan, setUpgradePlan] = useState("plus");
  const [upgrading, setUpgrading] = useState(false);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/redeem-codes");
      if (!res.ok) throw new Error("Failed to fetch codes");
      const data = await res.json();
      setCodes(data.codes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      const data = await res.json();
      setSubscriptions(data.subscriptions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data when tab changes
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (tab === "codes") {
        await fetchCodes();
      } else {
        await fetchSubscriptions();
      }
    }
    void load();
    return () => controller.abort();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/redeem-codes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: createCount,
          credits: createCredits,
          maxUses: createMaxUses,
          expiresAt: new Date(createExpiry).toISOString(),
          note: createNote || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "创建失败");
      }
      void fetchCodes();
      setCreateNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(`/api/admin/redeem-codes/${id}/revoke`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("吊销失败");
      void fetchCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "吊销失败");
    }
  }

  async function handleUpgrade() {
    setUpgrading(true);
    try {
      const res = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: upgradeUserId,
          planId: upgradePlan,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "升级失败");
      }
      setUpgradeUserId("");
      void fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "升级失败");
    } finally {
      setUpgrading(false);
    }
  }

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 sm:px-8 py-8 sm:py-12">
      <div className="w-full max-w-5xl">
        <h1 className="font-serif text-3xl font-semibold text-[var(--color-fg)] mb-6">
          管理后台
        </h1>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-6 font-sans">
          <button
            className={`px-4 py-2 rounded-lg transition-colors ${
              tab === "codes"
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-bg-pampas)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            }`}
            onClick={() => setTab("codes")}
          >
            兑换码管理
          </button>
          <button
            className={`px-4 py-2 rounded-lg transition-colors ${
              tab === "subscriptions"
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-bg-pampas)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
            }`}
            onClick={() => setTab("subscriptions")}
          >
            <Users className="inline size-4 mr-1" />
            订阅管理
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 font-sans text-sm text-red-700">
            <AlertCircle className="size-4 shrink-0" />
            {error}
            <button
              className="ml-auto text-red-500 hover:text-red-700"
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}

        {tab === "codes" && (
          <>
            {/* Create form */}
            <div className="glass-card rounded-2xl p-6 mb-6">
              <h2 className="font-serif text-lg font-semibold text-[var(--color-fg)] mb-4">
                生成兑换码
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-sans text-sm">
                <div>
                  <label className="block text-[var(--color-fg-muted)] mb-1">
                    数量
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={200}
                    value={createCount}
                    onChange={(e) =>
                      setCreateCount(Math.max(1, parseInt(e.target.value) || 1))
                    }
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-fg-muted)] mb-1">
                    每个码额度
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={createCredits}
                    onChange={(e) =>
                      setCreateCredits(
                        Math.max(1, parseInt(e.target.value) || 50),
                      )
                    }
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-fg-muted)] mb-1">
                    最大使用次数
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={createMaxUses}
                    onChange={(e) =>
                      setCreateMaxUses(
                        Math.max(1, parseInt(e.target.value) || 1),
                      )
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[var(--color-fg-muted)] mb-1">
                    过期时间
                  </label>
                  <Input
                    type="datetime-local"
                    value={createExpiry}
                    onChange={(e) => setCreateExpiry(e.target.value)}
                  />
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <label className="block text-[var(--color-fg-muted)] mb-1">
                    备注
                  </label>
                  <Input
                    placeholder="例如：评委专用"
                    value={createNote}
                    onChange={(e) => setCreateNote(e.target.value)}
                    maxLength={200}
                  />
                </div>
              </div>
              <Button
                className="mt-4 font-sans"
                onClick={() => void handleCreate()}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-4" />
                )}
                生成
              </Button>
            </div>

            {/* Codes table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-[var(--color-fg-muted)]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-sans text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-warm)]">
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        状态
                      </th>
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        兑换码
                      </th>
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        额度
                      </th>
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        使用
                      </th>
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        过期
                      </th>
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        备注
                      </th>
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map((code) => (
                      <tr
                        key={code.id}
                        className="border-b border-[var(--color-border-warm)]/50"
                      >
                        <td className="py-2 px-3">
                          {getStatusBadge(code)}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1">
                            <code className="font-mono text-xs">
                              {code.code}
                            </code>
                            <button
                              className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                              onClick={() => copyToClipboard(code.code)}
                            >
                              <Copy className="size-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3">{code.credits} 次</td>
                        <td className="py-2 px-3">
                          {code.used_count}/{code.max_uses}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {new Date(code.expires_at).toLocaleDateString("zh-CN")}
                        </td>
                        <td className="py-2 px-3 text-xs text-[var(--color-fg-muted)]">
                          {code.note ?? "—"}
                        </td>
                        <td className="py-2 px-3">
                          {!code.revoked && (
                            <Button
                              variant="ghost"
                              size="xs"
                              className="font-sans text-red-600 hover:text-red-700"
                              onClick={() => void handleRevoke(code.id)}
                            >
                              <Ban className="size-3 mr-1" />
                              吊销
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {codes.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-8 text-center text-[var(--color-fg-muted)]"
                        >
                          暂无兑换码
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "subscriptions" && (
          <>
            {/* Upgrade form */}
            <div className="glass-card rounded-2xl p-6 mb-6">
              <h2 className="font-serif text-lg font-semibold text-[var(--color-fg)] mb-4">
                手动升级套餐
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-sm">
                <div>
                  <label className="block text-[var(--color-fg-muted)] mb-1">
                    用户 ID
                  </label>
                  <Input
                    placeholder="UUID"
                    value={upgradeUserId}
                    onChange={(e) => setUpgradeUserId(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[var(--color-fg-muted)] mb-1">
                    目标套餐
                  </label>
                  <select
                    value={upgradePlan}
                    onChange={(e) => setUpgradePlan(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border-warm)] bg-white px-3 py-2 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="plus">Plus</option>
                    <option value="pro">PRO</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    className="font-sans"
                    onClick={() => void handleUpgrade()}
                    disabled={upgrading || !upgradeUserId.trim()}
                  >
                    {upgrading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    升级
                  </Button>
                </div>
              </div>
            </div>

            {/* Subscriptions table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-[var(--color-fg-muted)]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-sans text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border-warm)]">
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        套餐
                      </th>
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        月额度
                      </th>
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        剩余
                      </th>
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        兑换码额度
                      </th>
                      <th className="py-2 px-3 text-left text-[var(--color-fg-muted)]">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr
                        key={sub.id}
                        className="border-b border-[var(--color-border-warm)]/50"
                      >
                        <td className="py-2 px-3 font-medium">
                          {sub.plan?.name ?? sub.plan_id}
                        </td>
                        <td className="py-2 px-3">
                          {sub.plan?.monthly_credits === 0
                            ? "不限量"
                            : sub.plan?.monthly_credits ?? "—"}
                        </td>
                        <td className="py-2 px-3">
                          {sub.credits_remaining}
                        </td>
                        <td className="py-2 px-3">
                          {sub.bonus_credits - sub.bonus_credits_used}
                        </td>
                        <td className="py-2 px-3">
                          <Badge
                            variant={
                              sub.status === "active" ? "outline" : "destructive"
                            }
                          >
                            {sub.status === "active" ? "活跃" : sub.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {subscriptions.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-[var(--color-fg-muted)]"
                        >
                          暂无订阅数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}