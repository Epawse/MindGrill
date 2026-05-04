/**
 * Supabase environment guard.
 *
 * MindGrill keeps anonymous flow first-class — Supabase env is optional.
 * Use this helper before constructing a Supabase client so server code can
 * gracefully no-op when env is missing (e.g. evaluator's local clone).
 */
export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}
