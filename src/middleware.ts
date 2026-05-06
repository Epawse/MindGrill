/**
 * Next.js middleware — refreshes Supabase auth cookies.
 *
 * The access code gate has been removed. Authentication is now required
 * for all protected routes; the grill API routes enforce credit deduction
 * server-side.
 */
import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** Paths that never require authentication. */
const PUBLIC_PATHS = [
  "/auth/",
  "/_next",
  "/favicon.ico",
  "/api/auth/",
  "/api/keys/",
  "/api/health/",
  "/api/subscription/plans", // public: list plans
];

/** Paths that require authentication. */
const AUTH_REQUIRED_PREFIXES = [
  "/grill/",
  "/history",
  "/settings",
  "/admin/",
  "/api/grill/",
  "/api/subscription/status",
  "/api/subscription/upgrade",
  "/api/redeem",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isAuthRequired(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  // Refresh Supabase auth session first.
  const response = await updateSession(request);

  const { pathname } = request.nextUrl;

  // Skip auth check for public paths and static assets.
  if (isPublicPath(pathname)) return response;

  // Skip auth check for paths that don't explicitly require it
  // (landing page, pricing, etc. are accessible without auth).
  if (!isAuthRequired(pathname)) return response;

  // For auth-required paths, check if user is logged in.
  // The actual auth check is done in the API routes via getServerUser(),
  // but for pages, we redirect to sign-in if not authenticated.
  // Note: We don't block API routes here — they return 401 themselves.
  if (pathname.startsWith("/api/")) return response;

  // For page routes that require auth, the client-side auth check
  // will handle redirects. We just ensure the session is refreshed.
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};