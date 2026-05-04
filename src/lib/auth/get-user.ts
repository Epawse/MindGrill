/**
 * Auth helpers — server-side user resolver.
 *
 * Returns `null` whenever Supabase isn't configured or the visitor is
 * anonymous. Callers must treat absence-of-user as a normal path.
 */
import { getServerSupabase } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export interface ServerUser {
  user: User;
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export async function getServerUser(): Promise<ServerUser | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile ?? {
      id: user.id,
      display_name: user.email?.split("@")[0] ?? null,
      avatar_url: null,
    },
  };
}
