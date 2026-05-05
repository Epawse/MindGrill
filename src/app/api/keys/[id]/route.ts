/**
 * DELETE /api/keys/:id
 *
 * Delete a specific user API key row by its ID.
 * RLS ensures the user can only delete their own keys.
 */
import { NextRequest } from "next/server";

import { getServerUser } from "@/lib/auth/get-user";
import { getServerSupabase } from "@/lib/supabase/server";
import { UnauthorizedError, errorResponse } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getServerUser();
    if (!user) {
      throw new UnauthorizedError("请登录后管理 API Key");
    }

    const { id } = await params;
    if (!id) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing key id" } },
        { status: 400 },
      );
    }

    const supabase = await getServerSupabase();
    if (!supabase) {
      return Response.json(
        { error: { code: "SERVICE_UNAVAILABLE", message: "数据库不可用" } },
        { status: 503 },
      );
    }

    // RLS ensures the user can only delete their own keys
    const { error } = await supabase
      .from("user_provider_keys")
      .delete()
      .eq("id", id)
      .eq("user_id", user.user.id);

    if (error) {
      logger.error("keys.delete.db_error", { error: error.message, keyId: id });
      return Response.json(
        { error: { code: "DB_ERROR", message: "删除失败" } },
        { status: 500 },
      );
    }

    logger.info("keys.delete.ok", { keyId: id });

    return Response.json({ success: true });
  } catch (err) {
    logger.error("keys.delete.error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(err);
  }
}