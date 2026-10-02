import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Google OAuth landing route.
 *
 * Supabase redirects here with ?code=... (PKCE). The browser client stashed the
 * code_verifier in a cookie when signInWithOAuth ran, so this route rebuilds a
 * server client, reads that cookie, and trades the code for a session.
 *
 * Must be a Route Handler (not a page) so the session cookies land in the
 * response before we redirect onward.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  const requestedNext = searchParams.get("next") ?? "/chat";

  const backToLogin = (message: string) =>
    NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(message)}`,
    );

  if (providerError) return backToLogin(providerError);
  if (!code) return backToLogin("Google sign-in returned no authorization code.");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return backToLogin("Supabase environment variables are missing.");
  }

  // NextRequest.cookies.set() takes no options, so collect writes here and apply
  // them to the outgoing NextResponse instead.
  let sessionCookies: CookieToSet[] = [];

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        sessionCookies = cookiesToSet as CookieToSet[];
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return backToLogin(error.message);

  // Open-redirect guard: only same-origin absolute paths are allowed.
  const safeNext =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/chat";

  const response = NextResponse.redirect(`${origin}${safeNext}`);
  for (const { name, value, options } of sessionCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}
