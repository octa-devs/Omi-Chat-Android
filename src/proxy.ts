import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * The auth gate.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`; `middleware` is
 * deprecated. The behaviour is the same - code that runs before a request is
 * completed, able to redirect before any page renders. So an unauthenticated
 * visitor never sees a frame of the app, and an authenticated one never sees a
 * frame of the login screen. As of 16.0 this runs on the Node.js runtime by
 * default, which is why the env vars below read normally here.
 *
 * Two jobs:
 *   1. `/` is a router, not a page. Signed in -> the app. Signed out -> sign in.
 *   2. Protected routes require a session. This is what actually secures
 *      /settings and /call, neither of which had any guard of its own.
 *
 * This is convenience and defence in depth, NOT the security boundary. Every
 * table has RLS, so a forged cookie buys an attacker a rendered shell and
 * nothing else - the first query they make returns zero rows.
 */

/** Reachable with no session. */
const PUBLIC_PATHS = new Set([
  "/login",
  "/signup",
  "/auth/callback",
  "/about",
  "/welcome",
  // Legal pages must be readable without an account — including by the people
  // whose data they describe, who by definition never signed up.
  "/privacy",
  "/terms",
]);

/** The auth screens specifically - signed-in users get bounced off these. */
const AUTH_PATHS = new Set(["/login", "/signup"]);

/** Where the gate sends people who are allowed in. */
const HOME = "/chat";

/**
 * Identify the caller from the session cookie.
 *
 * getClaims() verifies the JWT locally against the project's JWKS, so the
 * common path costs no network round trip. Projects still on the legacy
 * symmetric signing key cannot be verified that way, so an error there falls
 * back to getUser(), which asks the Auth server. Correctness first: a gate
 * that lets everyone through because verification threw would be worse than
 * one extra request.
 */
async function readSession(
  request: NextRequest,
  onCookies: (cookies: CookieToSet[]) => void,
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return false;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => onCookies(toSet as CookieToSet[]),
    },
  });

  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!error) return Boolean(data?.claims);
  } catch {
    /* fall through to getUser() */
  }

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return false;
    return Boolean(data?.user);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  // Refreshed session cookies are collected here and attached to whichever
  // response we end up returning, so a redirect does not discard them.
  let sessionCookies: CookieToSet[] = [];
  const isSignedIn = await readSession(request, (c) => {
    sessionCookies = c;
  });

  const withCookies = (response: NextResponse) => {
    for (const { name, value, options } of sessionCookies) {
      response.cookies.set(name, value, options);
    }
    return response;
  };

  const redirectTo = (pathname: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    return withCookies(NextResponse.redirect(url));
  };

  const { pathname, search } = request.nextUrl;

  // API routes are not gated here. They authenticate their own requests, and
  // the presence beacon in particular has to be allowed to fire while a page
  // tears down. Any new API route must do its own check - see /api/presence.
  if (pathname.startsWith("/api/")) {
    return withCookies(NextResponse.next({ request }));
  }

  // The entry point. Signed in goes to the app, signed out goes to sign in.
  if (pathname === "/") {
    return redirectTo(isSignedIn ? HOME : "/login");
  }

  // Already inside? Then there is no reason to be looking at a login form.
  if (AUTH_PATHS.has(pathname) && isSignedIn) {
    return redirectTo(HOME);
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return withCookies(NextResponse.next({ request }));
  }

  // Everything else needs a session. Carry where they were headed so the form
  // can send them back after signing in, rather than dumping them at /chat.
  //
  // `next` is set unconditionally. Tying it to whether the URL happened to have
  // a query string would mean the most common deep link of all - /settings -
  // silently loses its destination.
  if (!isSignedIn) {
    const next = pathname + search;
    return redirectTo("/login", `?next=${encodeURIComponent(next)}`);
  }

  return withCookies(NextResponse.next({ request }));
}

export const config = {
  // Every path except Next's own build output and static assets. Anything with
  // a file extension is a real asset and must not be redirected.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|css|js|map|txt|xml|webmanifest)$).*)",
  ],
};