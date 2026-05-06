/**
 * Admin authentication helper.
 *
 * Checks that the current user is authenticated and has `is_admin = true`
 * in their profile. Returns the user object if admin, throws UnauthorizedError
 * otherwise.
 */
import { getServerUser } from "@/lib/auth/get-user";
import { getServerSupabase } from "@/lib/supabase/server";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function requireAdmin() {
  const serverUser = await getServerUser();
  if (!serverUser) {
    throw new UnauthorizedError("请登录后继续管理操作");
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    throw new UnauthorizedError("系统未配置，无法验证管理员身份");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", serverUser.user.id)
    .maybeSingle();

  if (error) {
    logger.error("admin_auth.profile_error", {
      error: error.message,
      userId: serverUser.user.id,
    });
    throw new UnauthorizedError("无法验证管理员身份");
  }

  if (!profile?.is_admin) {
    throw new UnauthorizedError("需要管理员权限");
  }

  return serverUser;
}