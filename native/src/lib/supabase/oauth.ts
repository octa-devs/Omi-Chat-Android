import * as WebBrowser from "expo-web-browser";

import { getSupabase } from "./client";

/**
 * Google sign-in on native.
 *
 * The web build could not do this: Google refuses to run OAuth inside an
 * embedded WebView, which is exactly what the old Android wrapper was. On
 * native we open the authorize URL in a Chrome Custom Tab via
 * openAuthSessionAsync — a real browser surface, so Google allows it — and the
 * redirect comes back to us as a string instead of navigating the app.
 *
 * Supabase must list `omichat://auth/callback` under Authentication → URL
 * Configuration → Redirect URLs, and Google's own redirect URI allow-list must
 * include the same value.
 */

/** Must match the `scheme` in app.json and the Android package. */
export const OAUTH_SCHEME = "omichat";
export const oauthRedirectUri = `${OAUTH_SCHEME}://auth/callback`;

// Lets an in-flight browser session be dismissed when the component unmounts.
WebBrowser.maybeCompleteAuthSession();

/**
 * Minimal query/fragment parser.
 *
 * React Native does not ship URLSearchParams (its URL polyfill is partial), so
 * pulling in react-native-url-polyfill just to read two fields is not worth it.
 */
function parseParams(input: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of input.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? "" : pair.slice(eq + 1);
    try {
      out[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, " "));
    } catch {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Pull the session out of the redirect URL.
 *
 * Under implicit flow Supabase returns the tokens in the fragment, which never
 * reaches a server and so cannot be logged or leaked through referrers. The
 * `code` branch is here so that flipping the client to PKCE later only needs
 * this function to change.
 */
async function sessionFromRedirect(url: string) {
  const hashAt = url.indexOf("#");
  const fragment = hashAt === -1 ? "" : url.slice(hashAt + 1);
  const queryAt = url.indexOf("?");
  const query = queryAt === -1 ? "" : url.slice(queryAt + 1, hashAt === -1 ? undefined : hashAt);

  const fromHash = parseParams(fragment);
  const fromQuery = parseParams(query);

  const merged = { ...fromQuery, ...fromHash };
  const description = merged.error_description ?? merged.error;
  if (description) throw new Error(description);

  if (merged.access_token && merged.refresh_token) {
    const { error } = await getSupabase().auth.setSession({
      access_token: merged.access_token,
      refresh_token: merged.refresh_token,
    });
    if (error) throw error;
    return;
  }

  const code = merged.code;
  if (code) {
    const { error } = await getSupabase().auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  throw new Error("Google sign-in did not return a session. Please try again.");
}

/** Thrown when the user backs out of the browser instead of completing. */
export class OAuthCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "OAuthCancelled";
  }
}

export async function signInWithGoogle(): Promise<void> {
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: oauthRedirectUri,
      // Return the authorize URL instead of the library trying to open it.
      // We drive the browser ourselves so the result comes back to this call.
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error("Supabase did not return an authorize URL.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, oauthRedirectUri);

  if (result.type === "cancel" || result.type === "dismiss") throw new OAuthCancelled();
  if (result.type !== "success") throw new Error("Google sign-in was interrupted.");

  await sessionFromRedirect(result.url);
}
