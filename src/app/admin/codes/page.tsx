"use client";

import { useState, useEffect } from "react";
import { Copy, RefreshCw, Ban, Plus, Loader2, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AccessCodeRow {
  id: string;
  code: string;
  quota_total: number;
  quota_used: number;
  expires_at: string;
  note: string | null;
  revoked: boolean;
  created_at: string;
  last_used_at: string | null;
}

// Default expiry: 7 days from now, computed once at module level.
function getDefaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 16);
}

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<AccessCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createCount, setCreateCount] = useState("10");
  const [createQuota, setCreateQuota] = useState("30");
  const [createExpiry, setCreateExpiry] = useState(getDefaultExpiry);
  const [createNote, setCreateNote] = useState("");
  const [creating, setCreating] = useState(false);

  // Initial data fetch on mount — using .then chain to satisfy
  // react-hooks/set-state-in-effect rule (same pattern as useProviderHealth).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/access-codes")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.message ?? "获取访问码失败");
        }
        return (await res.json()) as { codes: AccessCodeRow[] };
      })
      .then((data) => {
        if (!cancelled) {
          setCodes(data.codes ?? []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "获取访问码失败");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshCodes() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/access-codes");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "获取访问码失败");
      }
      const data = await res.json();
      setCodes(data.codes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "获取访问码失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createCount || !createQuota || !createExpiry) return;

    setCreating(true);
    try {
      const expiryDate = new Date(createExpiry);
      const res = await fetch("/api/access-codes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: parseInt(createCount, 10),
          quotaTotal: parseInt(createQuota, 10),
          expiresAt: expiryDate.toISOString(),
          note: createNote || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "创建失败");
      }

      setShowCreate(false);
      setCreateNote("");
      await refreshCodes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      const res = await fetch(`/api/access-codes/${id}/revoke`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "吊销失败");
      }
      await refreshCodes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "吊销失败");
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Silently fail — clipboard API may not be available.
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusBadge(code: AccessCodeRow) {
    if (code.revoked) {
      return <Badge variant="destructive">已吊销</Badge>;
    }
    if (new Date(code.expires_at) <= new Date()) {
      return <Badge variant="destructive">已过期</Badge>;
    }
    if (code.quota_used >= code.quota_total) {
      return <Badge variant="secondary">额度用尽</Badge>;
    }
    return (
      <Badge
        variant="outline"
        className="border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
      >
        有效
      </Badge>
    );
  }

  return (
    <main className="min-h-screen px-4 sm:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[var(--color-fg)]">
              访问码管理
            </h1>
            <p className="font-sans text-sm text-[var(--color-fg-muted)] mt-1">
              批量生成、查看用量、吊销访问码
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void refreshCodes()}>
              <RefreshCw className="size-4" /> 刷新
            </Button>
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              <Plus className="size-4" /> 生成
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-600 font-sans bg-red-50 px-4 py-3 rounded-md">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setError(null)}
            >
              关闭
            </Button>
          </div>
        )}

        {showCreate && (
          <form
            onSubmit={(e) => void handleCreate(e)}
            className="mb-8 bg-[var(--color-bg-pampas)] rounded-lg p-6 flex flex-col sm:flex-row gap-4 items-end"
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-sans text-[var(--color-fg-muted)]">
                数量
              </label>
              <Input
                type="number"
                min="1"
                max="200"
                value={createCount}
                onChange={(e) => setCreateCount(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-sans text-[var(--color-fg-muted)]">
                每码额度
              </label>
              <Input
                type="number"
                min="1"
                max="1000"
                value={createQuota}
                onChange={(e) => setCreateQuota(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-sans text-[var(--color-fg-muted)]">
                过期时间
              </label>
              <Input
                type="datetime-local"
                value={createExpiry}
                onChange={(e) => setCreateExpiry(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-sans text-[var(--color-fg-muted)]">
                备注
              </label>
              <Input
                type="text"
                value={createNote}
                onChange={(e) => setCreateNote(e.target.value)}
                placeholder="如: 第一批评委码"
                maxLength={200}
              />
            </div>
            <Button type="submit" disabled={creating} size="sm">
              {creating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "确认生成"
              )}
            </Button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-[var(--color-fg-muted)]" />
          </div>
        ) : codes.length === 0 ? (
          <p className="text-center font-sans text-[var(--color-fg-muted)] py-12">
            暂无访问码，点击上方&quot;生成&quot;按钮创建
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-[var(--color-fg)]/10 text-left text-[var(--color-fg-muted)]">
                  <th className="py-3 px-3">状态</th>
                  <th className="py-3 px-3">访问码</th>
                  <th className="py-3 px-3">额度</th>
                  <th className="py-3 px-3">过期</th>
                  <th className="py-3 px-3">备注</th>
                  <th className="py-3 px-3">最后使用</th>
                  <th className="py-3 px-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--color-fg)]/5 hover:bg-[var(--color-bg-pampas)]/50"
                  >
                    <td className="py-3 px-3">{getStatusBadge(c)}</td>
                    <td className="py-3 px-3 font-mono text-xs">
                      {c.code}
                      <button
                        onClick={() => void copyCode(c.code)}
                        className="ml-2 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                        title="复制"
                      >
                        <Copy className="size-3 inline" />
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      {c.quota_used}/{c.quota_total}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {formatDate(c.expires_at)}
                    </td>
                    <td className="py-3 px-3 text-xs max-w-[120px] truncate">
                      {c.note ?? "-"}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {formatDate(c.last_used_at)}
                    </td>
                    <td className="py-3 px-3">
                      {!c.revoked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => void handleRevoke(c.id)}
                        >
                          <Ban className="size-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}