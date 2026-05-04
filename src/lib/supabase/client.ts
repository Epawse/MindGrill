/**
 * Browser Supabase client. Lazy-instantiated; returns null when env missing.
 *
 * Anonymous mode (no env) must keep working: every consumer must null-check.
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

let cached: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const env = getSupabaseEnv();
  if (!env) return null;
  cached = createBrowserClient(env.url, env.anonKey);
  return cached;
}
