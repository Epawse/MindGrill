/**
 * GET /api/keys/models?providerId=x
 *
 * Discover available models for a provider using the user's stored key.
 * Best-effort: returns empty array if discovery fails (D1.5).
 */
import { NextRequest } from "next/server";

import { getServerUser } from "@/lib/auth/get-user";
import { getServerSupabase } from "@/lib/supabase/server";
import { decrypt } from "@/lib/ai/encryption";
import { isProviderId } from "@/lib/ai/provider-registry";
import { discoverModelsHttp } from "@/lib/ai/model-discovery";
import { UnauthorizedError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      throw new UnauthorizedError("请登录后查看模型列表");
    }

    const providerId = req.nextUrl.searchParams.get("providerId");
    if (!providerId || !isProviderId(providerId)) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid or missing providerId" } },
        { status: 400 },
      );
    }

    const supabase = await getServerSupabase();
    if (!supabase) {
      return Response.json({ models: [] });
    }

    // Get the user's stored key for this provider
    const { data, error } = await supabase
      .from("user_provider_keys")
      .select("encrypted_key, base_url")
      .eq("user_id", user.user.id)
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return Response.json({ models: [] });
    }

    let apiKey: string;
    try {
      apiKey = decrypt(data.encrypted_key);
    } catch {
      logger.warn("keys.models.decrypt_failed", { providerId });
      return Response.json({ models: [] });
    }

    const baseUrl = data.base_url || undefined;
    const models = await discoverModelsHttp(providerId, apiKey, baseUrl);

    return Response.json({ models });
  } catch (err) {
    logger.error("keys.models.error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err);
  }
}