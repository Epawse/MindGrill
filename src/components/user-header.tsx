"use client";

/**
 * Top-right auth header for the landing page.
 *
 * Polls Supabase auth state (only when configured); shows either a "登录保存历史"
 * link or "你好, {name} · 我的拷问 · 登出".
 *
 * Anonymous flow keeps working; this component renders nothing when Supabase
 * env is missing.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { History, LogOut, Settings, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getBrowserSupabase } from "@/lib/supabase/client";

interface AuthState {
  email: string | null;
  displayName: string | null;
}

export function UserHeader() {
  // Compute configuration synchronously at hydration time so the effect only
  // ever runs the async user/profile fetch (never an idempotent setState that
  // would trigger react-hooks/set-state-in-effect).
  const [configured] = useState(() => getBrowserSupabase() !== null);
  const [state, setState] = useState<AuthState>({
    email: null,
    displayName: null,
  });

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let cancelled = false;
    async function load() {
      if (!supabase) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setState({ email: null, displayName: null });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setState({
        email: user.email ?? null,
        displayName:
          (profile?.display_name as string | null) ??
          user.email?.split("@")[0] ??
          null,
      });
    }
    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!configured) {
    return (
      <Badge variant="outline" className="font-sans text-xs gap-1">
        匿名模式
      </Badge>
    );
  }

  if (state.email === null) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/auth/sign-in">
          <UserRound className="size-4" /> 登录保存历史
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm font-sans">
      <span className="text-[var(--color-fg-muted)] hidden sm:inline">
        你好, <span className="text-[var(--color-fg)]">{state.displayName}</span>
      </span>
      <Button asChild variant="outline" size="sm">
        <Link href="/history">
          <History className="size-4" /> 我的拷问
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link href="/settings">
          <Settings className="size-4" /> 设置
        </Link>
      </Button>
      <form action="/auth/sign-out" method="post">
        <Button variant="ghost" size="sm" type="submit">
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
