import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./client";
import { dbSetUsernameClaim, ensureUserProfile, touchPresence } from "./users";
import { oauthRedirectUri, signInWithGoogle as googleOAuth } from "./oauth";

/**
 * Auth surface.
 *
 * Copied from the web app's src/lib/supabase/auth.ts. Email, OTP, session and
 * profile handling are unchanged because Supabase behaves identically in both
 * environments. Three things are native-specific:
 *
 *   - redirectTo() points at a deep link instead of an https origin
 *   - signInWithGoogle() drives a Custom Tab rather than navigating the tab
 *   - setAuthPersistence() is still a no-op, but for a different reason (see
 *     the note on that function)
 */

/** Deep link the native app is registered to receive. Allow-list it in Supabase. */
function redirectTo(path?: string) {
  if (!path) return oauthRedirectUri;
  return `${oauthRedirectUri}?next=${encodeURIComponent(path)}`;
}

/**
 * Keep the session across restarts unless the user opted out.
 *
 * A no-op in both builds, for opposite reasons. On the web, @supabase/ssr
 * persists to cookies, which survive a reload whether or not the box is
 * ticked. Here the session lives in AsyncStorage, which likewise survives
 * process death. Implementing "session only" would mean clearing storage on
 * every cold start, which loses the session on any relaunch — so the checkbox
 * is accepted and ignored rather than faked.
 */
export async function setAuthPersistence(_remember: boolean) {
  /* intentionally empty — see above */
}

/* ── email + password ─────────────────────────────────────── */

/**
 * What sign-up actually produced.
 *
 * Both branches are normal. If the project has email confirmation switched off,
 * signUp() hands back a session and the user is in. If it is on — the sane
 * default — the account exists but is unverified, so `needs_otp` says so and the
 * form asks for the code, rather than telling the user to click an email link
 * they may never receive.
 */
export type SignUpOutcome =
  | { status: "signed_in"; user: User }
  | { status: "needs_otp"; email: string };

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  username: string;
  displayName: string;
  remember: boolean;
}): Promise<SignUpOutcome> {
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim();
  const displayName = input.displayName.trim() || `@${username}`;

  // Pre-flight only. The UNIQUE constraint on profiles.username is the actual
  // guarantee; the trigger substitutes a suffixed handle if we lose the race.
  if (!(await dbSetUsernameClaim(username))) {
    throw Object.assign(new Error("That @username is already taken."), {
      code: "auth/username-taken",
    });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      // Read by the handle_new_user() trigger to seed the profiles row. The
      // trigger fires on the auth.users insert, which happens NOW — before any
      // verification — so the handle is reserved on both paths.
      data: { username, display_name: displayName },
      // Unused on the OTP path, but kept so switching the email template back
      // to {{ .ConfirmationURL }} needs no code change.
      emailRedirectTo: redirectTo("/chat"),
    },
  });
  if (error) throw error;

  // Confirmation disabled: already authenticated, nothing left to do.
  if (data.session) {
    const user = data.user;
    if (!user) throw new Error("Sign-up did not return a user.");
    await ensureUserProfile(
      { uid: user.id, displayName, email, photoURL: null },
      { displayName, username },
    );
    return { status: "signed_in", user };
  }

  return { status: "needs_otp", email };
}

/**
 * Exchange the emailed verification code for a session.
 *
 * `type: "email"` is the signup-confirmation flow, not the "magiclink" type that
 * signInWithOtp uses. The template carrying {{ .Token }} is the same one that
 * used to carry {{ .ConfirmationURL }}.
 *
 * displayName/username are a backstop only. The trigger already wrote them from
 * the signUp metadata; re-asserting keeps the profile correct if confirmation
 * happens through some path that skipped it.
 */
export async function verifyEmailOtp(input: {
  email: string;
  token: string;
  displayName?: string;
  username?: string;
}) {
  const { data, error } = await getSupabase().auth.verifyOtp({
    email: input.email.trim(),
    token: input.token.trim(),
    type: "email",
  });
  if (error) throw error;

  const user = data.user;
  if (!user) {
    throw new Error("That code is wrong or has expired. Request a new one.");
  }

  await ensureUserProfile(
    {
      uid: user.id,
      displayName: input.displayName?.trim() || null,
      email: user.email ?? input.email.trim(),
      photoURL: (user.user_metadata?.avatar_url as string) ?? null,
    },
    {},
  );
  void touchPresence(user.id, "online");
  return user;
}

/**
 * Send the code again.
 *
 * `type: "signup"` is the confirmation template. The alternative,
 * "signup_new", is for confirming a changed address and fails once the account
 * is already verified — which is exactly when somebody wants a fresh code.
 */
export async function resendVerification(email: string) {
  const { error } = await getSupabase().auth.resend({
    type: "signup",
    email: email.trim(),
  });
  if (error) throw error;
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
  remember: boolean;
}) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("Sign-in did not return a user.");

  await ensureUserProfile(
    {
      uid: user.id,
      displayName: (user.user_metadata?.display_name as string) ?? null,
      email: user.email ?? null,
      photoURL: (user.user_metadata?.avatar_url as string) ?? null,
    },
    {},
  );
  void touchPresence(user.id, "online");
  return user;
}

export async function sendReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo("/login"),
  });
  if (error) throw error;
}

/* ── Google ───────────────────────────────────────────────── */

/**
 * Opens a Chrome Custom Tab and resolves once the session is in hand.
 *
 * The web version navigated the whole tab and returned nothing; here the flow
 * is awaited, so a failed sign-in throws and the caller can show the reason.
 * Google blocks OAuth inside an embedded WebView but permits Custom Tabs,
 * which is why this works natively and could never work in the old wrapper.
 */
export async function signInWithGoogle() {
  await googleOAuth();
}

/* ── session ──────────────────────────────────────────────── */

export async function updateDisplayName(user: User, displayName: string) {
  const { error } = await getSupabase().auth.updateUser({
    data: { display_name: displayName },
  });
  if (error) throw error;
  const { updateUser: updateProfile } = await import("./users");
  await updateProfile(user.id, { displayName });
}

export async function signOut() {
  const uid = (await getSupabase().auth.getUser()).data.user?.id;
  if (uid) await touchPresence(uid, "offline");
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}

/**
 * Subscribe to session changes.
 *
 * Fires once immediately with the current state (INITIAL_SESSION) — that is the
 * "am I signed in?" answer — and then on every change.
 */
export function watchAuth(cb: (user: User | null) => void): () => void {
  const {
    data: { subscription },
  } = getSupabase().auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

/** @internal exported for the username-claim cleanup path */
export async function checkUsernameAvailable(username: string) {
  return dbSetUsernameClaim(username);
}

export { dbSetUsernameClaim };
