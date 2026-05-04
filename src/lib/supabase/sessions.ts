/**
 * Session persistence layer.
 *
 * Wraps Supabase reads/writes for `grill_sessions`. Every function returns a
 * graceful fallback when Supabase isn't configured or the user is anonymous.
 */
import type { GrillSession, Revision } from "@/lib/schemas/grill";

import { getServerSupabase } from "./server";

export interface PersistedSession {
  id: string;
  user_id: string;
  scenario: GrillSession["scenario"];
  draft: string;
  tree_snapshot: GrillSession;
  revised_draft: string | null;
  revision: Revision | null;
  phase: GrillSession["phase"];
  status: "grilling" | "complete";
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface UpsertPayload {
  session: GrillSession;
  revision?: Revision | null;
  revisedDraft?: string | null;
}

export async function upsertSession(
  payload: UpsertPayload,
): Promise<PersistedSession | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { session, revision = null, revisedDraft = null } = payload;
  const status = session.phase === "COMPLETE" ? "complete" : "grilling";

  const row = {
    id: session.id,
    user_id: user.id,
    scenario: session.scenario,
    draft: session.draft,
    tree_snapshot: session as unknown as Record<string, unknown>,
    revised_draft: revisedDraft,
    revision: (revision ?? null) as unknown as Record<string, unknown> | null,
    phase: session.phase,
    status,
    completed_at:
      session.completedAt !== null
        ? new Date(session.completedAt).toISOString()
        : null,
  };

  const { data, error } = await supabase
    .from("grill_sessions")
    .upsert(row)
    .select()
    .single();

  if (error || !data) return null;
  return data as PersistedSession;
}

export async function listSessions(): Promise<PersistedSession[]> {
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("grill_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  return (data ?? []) as PersistedSession[];
}

export async function getSessionById(
  id: string,
): Promise<PersistedSession | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("grill_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (data ?? null) as PersistedSession | null;
}

export async function deleteSessionById(id: string): Promise<boolean> {
  const supabase = await getServerSupabase();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("grill_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  return !error;
}
