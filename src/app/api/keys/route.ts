/**
 * GET /api/keys
 *
 * Returns all stored API keys for the authenticated user.
 * Only key hints are returned (never the full key).
 */
import { getServerUser } from "@/lib/auth/get-user";
import { getServerSupabase } from "@/lib/supabase/server";
import { UnauthorizedError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      throw new UnauthorizedError("请登录后管理 API Key");
    }

    const supabase = await getServerSupabase();
    if (!supabase) {
      return Response.json({ keys: [] });
    }

    const { data, error } = await supabase
      .from("user_provider_keys")
      .select("id, provider_id, key_hint, base_url, created_at, updated_at")
      .eq("user_id", user.user.id)
      .order("provider_id", { ascending: true });

    if (error) {
      logger.error("keys.list.db_error", { error: error.message });
      return Response.json({ keys: [] });
    }

    return Response.json({ keys: data ?? [] });
  } catch (err) {
    logger.error("keys.list.error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err);
  }
}