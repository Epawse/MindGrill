/**
 * OAuth / magic-link callback handler.
 *
 * Supabase redirects here with `?code=…`; we exchange it for a session and
 * redirect to `?next` (defaulting to /history).
 */
import { NextResponse, type NextRequest } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/history";

  if (!code) {
    return NextResponse.redirect(new URL("/auth/sign-in", url));
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    // Supabase not configured — bounce home.
    return NextResponse.redirect(new URL("/", url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const errUrl = new URL("/auth/sign-in", url);
    errUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(errUrl);
  }

  return NextResponse.redirect(new URL(next, url));
}
