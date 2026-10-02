import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client.
 *
 * Uses the PUBLISHABLE key only. The secret key must never reach this module —
 * it bypasses Row Level Security, so shipping it would hand every visitor the
 * ability to read and write the entire database.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Check your .env file.",
    );
  }

  return createBrowserClient(url, key);
}

/** Cached singleton so we don't spin up a client per component render. */
let cached: ReturnType<typeof createClient> | undefined;

export function getSupabase() {
  if (!cached) cached = createClient();
  return cached;
}
