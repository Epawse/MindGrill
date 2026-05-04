/**
 * Refresh the Supabase session cookie on every middleware-handled request.
 *
 * Per @supabase/ssr docs: middleware must call `supabase.auth.getUser()` so
 * expired access tokens get refreshed and cookies re-emitted on the response.
 *
 * Returns the Next.js response with refreshed cookies attached. When Supabase
 * env is missing this is a passthrough — anonymous flow keeps working.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const env = getSupabaseEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const c of toSet) {
          request.cookies.set(c.name, c.value);
        }
        response = NextResponse.next({ request });
        for (const c of toSet) {
          response.cookies.set(c.name, c.value, c.options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
