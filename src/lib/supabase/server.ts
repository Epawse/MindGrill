/**
 * Server-side Supabase client.
 *
 * Reads the user's auth cookies via next/headers. Returns null when Supabase
 * env is missing — anonymous mode must always keep working.
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

export async function getServerSupabase(): Promise<SupabaseClient | null> {
  const env = getSupabaseEnv();
  if (!env) return null;

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const c of toSet) {
            cookieStore.set(c.name, c.value, c.options);
          }
        } catch {
          // setAll fails inside a Server Component (read-only cookies). The
          // middleware refreshes the session, so we can swallow this safely.
        }
      },
    },
  });
}
