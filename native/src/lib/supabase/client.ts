import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRandomValues, randomUUID } from "expo-crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client for React Native.
 *
 * This is the ONE file in the data layer that could not be copied verbatim —
 * the web build used `@supabase/ssr`'s createBrowserClient, which exists to
 * bridge Next.js cookie handling. React Native has no request/response cycle,
 * so the plain `supabase-js` client with AsyncStorage-backed sessions is the
 * right shape here. Every other file under lib/supabase is unchanged and calls
 * `getSupabase()` exactly as before.
 */

/**
 * Hermes ships without Web Crypto. Supabase uses `crypto.getRandomValues` for
 * things like OTP state and jti generation, so a missing implementation shows
 * up as a runtime crash rather than a compile error. expo-crypto provides a
 * synchronous, in-place implementation, which makes this a safe swap.
 */
function installCryptoPolyfill() {
  const g = globalThis as unknown as { crypto?: Record<string, unknown> };
  if (typeof (g.crypto?.getRandomValues) === "function") return;

  g.crypto = {
    ...g.crypto,
    getRandomValues,
    randomUUID,
  };
}

installCryptoPolyfill();

const DEFAULT_URL = "https://lfbrsfenvhgwzaawuasw.supabase.co";
const DEFAULT_KEY = "sb_publishable_DHk7cmplT0dZY3fsCW4OdQ_3CCWSV0n";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

let cached: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  cached = createClient(url, key, {
    auth: {
      // Sessions survive app restarts, which is what makes "stay signed in"
      // work the same way it does on the web.
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,

      // The native app receives OAuth tokens from openAuthSessionAsync and
      // hands them over in setSession(). There is no browser URL to scrape at
      // startup, and leaving this on makes the client try to parse the cold
      // start URL, which on a deep link is the app's own scheme.
      detectSessionInUrl: false,

      // Implicit flow. This is the client default, set explicitly because it
      // is a load-bearing decision: PKCE would need crypto for the verifier
      // and a code-for-session exchange. Implicit returns the tokens directly
      // in the redirect fragment, which is simpler on native and is why this
      // file needs no PKCE plumbing.
      flowType: "implicit",
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });

  return cached;
}

/** Drop the cached client. Used by sign-out paths and tests. */
export function resetSupabase() {
  cached = undefined;
}
