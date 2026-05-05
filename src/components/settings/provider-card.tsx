"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

import type { ProviderId, ProviderMeta } from "@/lib/ai/provider-registry";
import type { StoredKey } from "@/hooks/use-provider-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProviderCardProps {
  meta: ProviderMeta;
  storedKeys: StoredKey[];
  isLoggedIn: boolean;
  onSave: (providerId: ProviderId, apiKey: string, baseUrl?: string) => Promise<void>;
  onTest: (
    providerId: ProviderId,
    apiKey: string,
    baseUrl?: string,
  ) => Promise<{ success: boolean; models?: string[]; error?: string } | null>;
  onDelete: (id: string) => Promise<boolean>;
  /** Whether this provider has env keys configured (from health check) */
  envConfigured: boolean;
  envKeyCount: number;
  className?: string;
}

type TestStatus = "idle" | "testing" | "success" | "error";

export function ProviderCard({
  meta,
  storedKeys,
  isLoggedIn,
  onSave,
  onTest,
  onDelete,
  envConfigured,
  envKeyCount,
  className,
}: ProviderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<string[] | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "done">("idle");

  const hasUserKeys = storedKeys.length > 0;
  const isConfigured = hasUserKeys || envConfigured;

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setTestStatus("testing");
    setTestError(null);
    setDiscoveredModels(null);

    const result = await onTest(meta.id, apiKey, baseUrl || undefined);
    if (result?.success) {
      setTestStatus("success");
      setDiscoveredModels(result.models ?? null);
    } else {
      setTestStatus("error");
      setTestError(result?.error ?? "连接失败");
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaveStatus("saving");
    await onSave(meta.id, apiKey, baseUrl || undefined);
    setSaveStatus("done");
    setApiKey("");
    setBaseUrl("");
    setTestStatus("idle");
    setDiscoveredModels(null);
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handleDelete = async (id: string) => {
    await onDelete(id);
  };

  const statusBadge = isConfigured ? (
    <Badge
      variant="outline"
      className="gap-1 border-emerald-500/40 text-emerald-700 bg-emerald-500/10 font-sans text-xs"
    >
      <CheckCircle2 className="size-3" />
      {hasUserKeys ? `${storedKeys.length} key(s)` : `env (${envKeyCount})`}
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="gap-1 border-muted-foreground/40 text-muted-foreground font-sans text-xs"
    >
      <XCircle className="size-3" />
      未配置
    </Badge>
  );

  return (
    <div className={cn("border border-[var(--color-border-warm)] rounded-2xl bg-white/70 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden", className)}>
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--color-bg-pampas)]/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col min-w-0">
            <span className="font-sans font-semibold text-[var(--color-fg)] text-sm truncate">
              {meta.displayName}
            </span>
            <span className="font-sans text-xs text-[var(--color-fg-muted)] truncate">
              {meta.blurb}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge}
          {expanded ? (
            <ChevronUp className="size-4 text-[var(--color-fg-muted)]" />
          ) : (
            <ChevronDown className="size-4 text-[var(--color-fg-muted)]" />
          )}
        </div>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 space-y-4">
              {/* Existing keys */}
              {storedKeys.length > 0 && (
                <div className="space-y-2">
                  <p className="font-sans text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">
                    已保存的 Key
                  </p>
                  {storedKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--color-bg-pampas)] font-mono text-sm"
                    >
                      <span className="truncate">{key.key_hint}</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(key.id)}
                        className="text-[var(--color-fg-muted)] hover:text-[var(--color-accent)] transition-colors shrink-0"
                        aria-label="删除此 Key"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new key */}
              {isLoggedIn ? (
                <div className="space-y-3">
                  <p className="font-sans text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">
                    添加新 Key
                  </p>
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type={showKey ? "text" : "password"}
                        placeholder="输入 API Key"
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          setTestStatus("idle");
                          setTestError(null);
                          setDiscoveredModels(null);
                        }}
                        className="font-mono pr-10"
                        disabled={saveStatus === "saving"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                        aria-label={showKey ? "隐藏 Key" : "显示 Key"}
                      >
                        {showKey ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    {meta.requiresBaseUrl && (
                      <Input
                        type="text"
                        placeholder={`Base URL (默认: ${meta.defaultBaseUrl ?? ""})`}
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        className="font-mono"
                        disabled={saveStatus === "saving"}
                      />
                    )}
                  </div>

                  {/* Test result feedback */}
                  {testStatus === "success" && (
                    <div className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-700 font-sans text-sm">
                      连通性测试通过
                      {discoveredModels && discoveredModels.length > 0 && (
                        <span className="ml-1 text-xs">
                          ({discoveredModels.length} 个模型可用)
                        </span>
                      )}
                    </div>
                  )}
                  {testStatus === "error" && testError && (
                    <div className="px-3 py-2 rounded-lg bg-red-500/10 text-red-700 font-sans text-sm">
                      {testError}
                    </div>
                  )}
                  {discoveredModels && discoveredModels.length > 0 && (
                    <div className="px-3 py-2 rounded-lg bg-[var(--color-bg-pampas)] font-sans text-xs space-y-1">
                      <p className="text-[var(--color-fg-muted)] uppercase tracking-wider">
                        可用模型
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {discoveredModels.map((m) => (
                          <span
                            key={m}
                            className="px-1.5 py-0.5 bg-white rounded text-[var(--color-fg)] border border-[var(--color-border-warm)]"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleTest}
                      disabled={!apiKey.trim() || testStatus === "testing"}
                      variant="default"
                      size="sm"
                      className="font-sans"
                    >
                      {testStatus === "testing" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          测试中...
                        </>
                      ) : (
                        "测试连通性"
                      )}
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={!apiKey.trim() || saveStatus === "saving"}
                      variant="ghost"
                      size="sm"
                      className="font-sans"
                    >
                      {saveStatus === "saving" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          保存中...
                        </>
                      ) : saveStatus === "done" ? (
                        "已保存"
                      ) : (
                        "直接保存"
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-4 rounded-lg bg-[var(--color-bg-pampas)] text-center">
                  <p className="font-sans text-sm text-[var(--color-fg-muted)]">
                    登录后可自定义 API Key
                  </p>
                </div>
              )}

              {/* Env key info */}
              {envConfigured && (
                <p className="font-sans text-xs text-[var(--color-fg-muted)]">
                  服务器已配置 {envKeyCount} 个环境变量 Key
                  {hasUserKeys ? "（优先使用你的自定义 Key）" : ""}
                </p>
              )}

              {/* Recommended models */}
              <div className="space-y-1">
                <p className="font-sans text-xs text-[var(--color-fg-muted)] uppercase tracking-wider">
                  推荐模型
                </p>
                <div className="flex flex-wrap gap-1">
                  {meta.recommendedModels.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 text-xs font-mono bg-white rounded border border-[var(--color-border-warm)]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}