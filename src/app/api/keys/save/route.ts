/**
 * POST /api/keys/save
 *
 * Save (encrypt and store) one API key for the authenticated user.
 * One key per row per D1.3.
 *
 * Body: { providerId: string, apiKey: string, baseUrl?: string }
 * Response: { id, providerId, keyHint }
 */
import { NextRequest } from "next/server";
import { z } from "zod";

import { getServerUser } from "@/lib/auth/get-user";
import { getServerSupabase } from "@/lib/supabase/server";
import { encrypt, generateKeyHint } from "@/lib/ai/encryption";
import { isProviderId, PROVIDER_IDS } from "@/lib/ai/provider-registry";
import { UnauthorizedError, ValidationError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const SaveKeySchema = z.object({
  providerId: z.string().refine(
    (v): v is typeof PROVIDER_IDS[number] => isProviderId(v),
    { message: "Invalid providerId" },
  ),
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      throw new UnauthorizedError("请登录后管理 API Key");
    }

    const json = await req.json().catch(() => null);
    const parsed = SaveKeySchema.safeParse(json);
    if (!parsed.success) {
      throw new ValidationError(
        "body",
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      );
    }

    const { providerId, apiKey, baseUrl } = parsed.data;
    const keyHint = generateKeyHint(apiKey);
    const encryptedKey = encrypt(apiKey);
    const cleanBaseUrl = baseUrl && baseUrl.trim() !== "" ? baseUrl.trim() : null;

    const supabase = await getServerSupabase();
    if (!supabase) {
      return Response.json(
        { error: { code: "SERVICE_UNAVAILABLE", message: "数据库不可用" } },
        { status: 503 },
      );
    }

    const { data, error } = await supabase
      .from("user_provider_keys")
      .insert({
        user_id: user.user.id,
        provider_id: providerId,
        encrypted_key: encryptedKey,
        key_hint: keyHint,
        base_url: cleanBaseUrl,
      })
      .select("id, provider_id, key_hint, base_url, created_at, updated_at")
      .single();

    if (error) {
      logger.error("keys.save.db_error", { error: error.message, providerId });
      return Response.json(
        { error: { code: "DB_ERROR", message: "保存失败，请重试" } },
        { status: 500 },
      );
    }

    logger.info("keys.save.ok", {
      providerId,
      keyHint,
      userId: user.user.id,
    });

    return Response.json({
      key: {
        id: data.id,
        providerId: data.provider_id,
        keyHint: data.key_hint,
        baseUrl: data.base_url,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    logger.error("keys.save.error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err);
  }
}