/**
 * Next.js middleware — refreshes Supabase auth cookies and enforces access code gate.
 *
 * Flow:
 * 1. Call updateSession() (refresh Supabase auth cookie)
 * 2. Logged-in user? → pass through (no code check)
 * 3. Request to /api/keys/* or /api/auth/* → pass through
 * 4. Has valid access_code cookie? → check DB if code still valid → valid, pass through
 * 5. Has ?code=xxx param? → validate code → set cookie → redirect (strip ?code)
 * 6. No code? → redirect to /verify
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { updateSession } from "@/lib/supabase/middleware";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Paths that bypass the access code gate entirely. */
const CODE_GATE_BYPASS_PREFIXES = [
  "/api/keys/",
  "/api/auth/",
  "/api/access-codes/",
  "/api/health/",
];

/** Paths that never require access code (static assets, verify page itself). */
const NO_CODE_CHECK_PREFIXES = ["/verify", "/_next", "/favicon.ico"];

function shouldBypassCodeGate(pathname: string): boolean {
  return CODE_GATE_BYPASS_PREFIXES.some((p) => pathname.startsWith(p));
}

function shouldSkipCodeCheck(pathname: string): boolean {
  return NO_CODE_CHECK_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Step 1: Always refresh Supabase auth session first.
  const response = await updateSession(request);

  // Steps 2-6: Access code gate (only when Supabase is configured).
  const env = getSupabaseEnv();
  if (!env) return response;

  const { pathname } = request.nextUrl;

  // Skip code check for static assets, verify page, etc.
  if (shouldSkipCodeCheck(pathname)) return response;

  // Skip code check for API routes that don't need gating.
  if (shouldBypassCodeGate(pathname)) return response;

  // Step 2: Check if user is logged in.
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // Read-only in middleware; we already refreshed via updateSession.
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Logged-in user bypasses the code gate entirely.
    return response;
  }

  // Step 5: Check for ?code=xxx query parameter.
  const codeParam = request.nextUrl.searchParams.get("code");
  if (codeParam) {
    // Normalize to uppercase — codes are MG-JUDGE-<chars> (uppercase).
    const normalizedCode = codeParam.toUpperCase().trim();
    // Validate the code against the DB.
    const valid = await isCodeValidInDb(normalizedCode, env);
    if (valid) {
      // Set cookie and redirect to strip the ?code param.
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.searchParams.delete("code");
      const redirectResponse = NextResponse.redirect(redirectUrl);
      setAccessCodeCookie(redirectResponse, normalizedCode);
      return redirectResponse;
    }
    // Invalid code from URL param: redirect to /verify with error.
    const verifyUrl = new URL("/verify", request.url);
    verifyUrl.searchParams.set("error", "invalid_code");
    return NextResponse.redirect(verifyUrl);
  }

  // Step 4: Check for access_code cookie.
  const accessCodeCookie = request.cookies.get("access_code")?.value;
  if (accessCodeCookie) {
    const valid = await isCodeValidInDb(accessCodeCookie, env);
    if (valid) {
      return response;
    }
    // Cookie exists but code is no longer valid — clear cookie and redirect.
    const verifyUrl = new URL("/verify", request.url);
    verifyUrl.searchParams.set("error", "code_invalid");
    const redirectResponse = NextResponse.redirect(verifyUrl);
    redirectResponse.cookies.set("access_code", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    return redirectResponse;
  }

  // Step 6: No code at all — redirect to /verify.
  const verifyUrl = new URL("/verify", request.url);
  // Preserve the original path so we can redirect back after verification.
  verifyUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(verifyUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

// ---------------------------------------------------------------------------
// Helpers (module-scoped)
// ---------------------------------------------------------------------------

/**
 * Check if an access code is still valid in the database.
 *
 * Uses the `is_access_code_valid` SECURITY DEFINER function which bypasses
 * RLS — this is necessary because middleware runs without user auth context
 * and the access_codes table has RLS enabled.
 *
 * Returns true if the code exists, is not revoked, not expired, and has
 * remaining quota. Returns false otherwise.
 */
async function isCodeValidInDb(
  code: string,
  env: { url: string; anonKey: string },
): Promise<boolean> {
  try {
    const supabase = createServerClient(env.url, env.anonKey, {
      cookies: {
        getAll() {
          return [] as ReturnType<NextRequest["cookies"]["getAll"]>;
        },
        setAll() {
          // Read-only check; no cookie mutations.
        },
      },
    });

    const { data, error } = await supabase.rpc("is_access_code_valid", {
      p_code: code,
    });

    if (error || data === null) return false;
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Set the access_code cookie on a response with secure attributes.
 *
 * Cookie spec: HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=7d
 */
function setAccessCodeCookie(response: NextResponse, code: string): void {
  response.cookies.set("access_code", code, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}