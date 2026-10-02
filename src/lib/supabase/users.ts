import { getSupabase } from "./client";
import { onTable } from "./realtime";
import {
  rowToUser,
  slimToUser,
  type ProfileRow,
  type SlimProfileRow,
} from "./rows";
import {
  DEFAULT_SETTINGS,
  type OmiUser,
  type PresenceState,
  type UserSettings,
} from "../types";

/**
 * Profiles, presence, settings, blocklist, search.
 *
 * Signature-compatible with the Firebase module it replaces, so the settings
 * screen, the auth provider and the new-chat dialog are unchanged.
 *
 * Every watch* here returns its unsubscribe synchronously, even though the
 * first fetch is async. Returning a Promise would break every caller's
 * `return unwatch` cleanup, and wrapping it in an effect would race unmount.
 */

/** Postgres reports a unique violation as 23505. */
const UNIQUE_VIOLATION = "23505";

const normalize = (u: string) => u.trim().toLowerCase();

/* ── reads ────────────────────────────────────────────────── */

/** One profile, with its blocklist and pin/mute maps folded in. */
export async function getUser(uid: string): Promise<OmiUser | null> {
  const { data, error } = await getSupabase().rpc("get_profiles", { ids: [uid] });
  if (error) throw error;
  const row = (data as ProfileRow[])[0];
  return row ? rowToUser(row) : null;
}

/** Many profiles in one round trip. */
export async function getUsers(uids: string[]): Promise<Record<string, OmiUser>> {
  if (!uids.length) return {};
  const { data, error } = await getSupabase().rpc("get_profiles", { ids: uids });
  if (error) throw error;
  const out: Record<string, OmiUser> = {};
  for (const row of data as ProfileRow[]) out[row.id] = rowToUser(row);
  return out;
}

/* ── profile lifecycle ────────────────────────────────────── */

export async function ensureUserProfile(
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  },
  extra: Partial<Pick<OmiUser, "displayName" | "username" | "avatarUrl">>,
): Promise<OmiUser> {
  const existing = await getUser(user.uid);
  if (existing) {
    await setPresence(user.uid, "online");
    return existing;
  }

  // The on-auth-user-created trigger normally gets here first. This is the
  // fallback for a profile row that was removed by hand.
  const fallback =
    extra.username ??
    (user.email
      ? user.email.split("@")[0].replace(/[^\w]/g, "").slice(0, 18)
      : "") ??
    `omi${user.uid.slice(0, 6)}`;

  const { data, error } = await getSupabase()
    .from("profiles")
    .insert({
      id: user.uid,
      username: normalize(fallback || "user"),
      display_name: extra.displayName ?? user.displayName ?? fallback,
      avatar_url: extra.avatarUrl ?? user.photoURL ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // Lost a race with the trigger. Read whatever the trigger made.
    const raced = await getUser(user.uid).catch(() => null);
    if (raced) return raced;
    throw error;
  }

  await setPresence(user.uid, "online");
  return slimToUser(data as SlimProfileRow);
}

/* ── writes ───────────────────────────────────────────────── */

export async function updateUser(
  uid: string,
  patch: Partial<Omit<OmiUser, "uid">>,
) {
  const body: Record<string, unknown> = {};

  if (patch.displayName !== undefined) body.display_name = patch.displayName;
  if (patch.avatarUrl !== undefined) body.avatar_url = patch.avatarUrl;
  if (patch.bio !== undefined) body.bio = patch.bio;
  if (patch.statusText !== undefined) body.status_text = patch.statusText;
  if (patch.settings !== undefined) body.settings = patch.settings;
  if (patch.username !== undefined) body.username = normalize(patch.username);

  if (Object.keys(body).length) {
    const { error } = await getSupabase()
      .from("profiles")
      .update(body)
      .eq("id", uid);
    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        throw new Error("That @username is already taken.");
      }
      throw error;
    }
  }

  // Pin and mute live on the membership row, not the profile.
  for (const [chatId, on] of Object.entries(patch.pinnedChats ?? {})) {
    await setPinned(uid, chatId, on === true);
  }
  for (const [chatId, on] of Object.entries(patch.mutedChats ?? {})) {
    await setMuted(uid, chatId, on === true);
  }
  for (const [target, on] of Object.entries(patch.blocked ?? {})) {
    await setBlocked(uid, target, on === true);
  }
}

/* ── usernames ────────────────────────────────────────────── */

export async function isUsernameTaken(username: string) {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id")
    .eq("username", normalize(username))
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/**
 * Reserve a @handle.
 *
 * The Firebase version needed a runTransaction plus a `__pending__` sentinel to
 * make the claim atomic. Postgres gets exclusivity from the UNIQUE constraint
 * on profiles.username for free, so this is only a pre-flight check — the
 * constraint is the real guarantee, and a signup that loses the race is handed
 * a suffixed handle by the DB trigger instead of failing outright.
 */
export async function dbSetUsernameClaim(username: string) {
  return !(await isUsernameTaken(username));
}

export async function findUserByUsername(username: string) {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("username", normalize(username))
    .maybeSingle();
  if (error) return null;
  return data ? slimToUser(data as SlimProfileRow) : null;
}

/**
 * Substring search over username and display name.
 *
 * The Firebase version had to pull the whole user tree into memory and filter it
 * in JavaScript, because RTDB has no LIKE. Postgres does it against an index.
 */
export async function searchUsers(term: string, limit = 20) {
  const needle = normalize(term);
  if (needle.length < 2) return [] as OmiUser[];

  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .or(`username.ilike.%${needle}%,display_name.ilike.%${needle}%`)
    .order("username")
    .limit(limit);

  if (error) throw error;
  return (data as SlimProfileRow[]).map(slimToUser);
}

/* ── presence ─────────────────────────────────────────────── */

export async function setPresence(uid: string, presence: PresenceState) {
  const { error } = await getSupabase()
    .from("profiles")
    .update({ presence, last_seen: new Date().toISOString() })
    .eq("id", uid);
  if (error) throw error;
}

export function touchPresence(uid: string, presence: PresenceState) {
  return setPresence(uid, presence).catch(() => undefined);
}

/* ── live profile ─────────────────────────────────────────── */

export function watchUser(uid: string, cb: (user: OmiUser | null) => void): () => void {
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const refresh = async () => {
    const fresh = await getUser(uid).catch(() => null);
    if (alive) cb(fresh);
  };

  // Coalesce: a settings save can touch several rows at once.
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void refresh(), 90);
  };

  void refresh();

  // Two sources: the profile row, and the membership rows that carry the
  // pin/mute maps the profile adapter folds in.
  const offProfile = onTable("profiles", schedule, { column: "id", value: uid });
  const offMembership = onTable("chat_members", schedule, {
    column: "user_id",
    value: uid,
  });

  return () => {
    alive = false;
    if (timer) clearTimeout(timer);
    offProfile();
    offMembership();
  };
}

/* ── settings ─────────────────────────────────────────────── */

export function watchSettings(
  uid: string,
  cb: (settings: UserSettings) => void,
): () => void {
  return watchUser(uid, (u) => {
    cb({ ...DEFAULT_SETTINGS, ...(u?.settings ?? {}) });
  });
}

export async function saveSettings(uid: string, settings: UserSettings) {
  const { error } = await getSupabase()
    .from("profiles")
    .update({ settings })
    .eq("id", uid);
  if (error) throw error;
}

/* ── moderation + per-chat flags ──────────────────────────── */

export async function setBlocked(uid: string, blockedUid: string, blocked: boolean) {
  const supabase = getSupabase();
  if (blocked) {
    const { error } = await supabase
      .from("blocked")
      .insert({ user_id: uid, blocked_id: blockedUid });
    // 23503: the target no longer has a profile. Nothing to block, not fatal.
    if (error && error.code !== "23503") throw error;
  } else {
    const { error } = await supabase
      .from("blocked")
      .delete()
      .eq("user_id", uid)
      .eq("blocked_id", blockedUid);
    if (error) throw error;
  }
}

async function setMembershipFlag(
  uid: string,
  chatId: string,
  column: "pinned" | "muted",
  value: boolean,
) {
  const { error } = await getSupabase()
    .from("chat_members")
    .update({ [column]: value })
    .eq("chat_id", chatId)
    .eq("user_id", uid);
  if (error) throw error;
}

export function setMuted(uid: string, chatId: string, muted: boolean) {
  return setMembershipFlag(uid, chatId, "muted", muted);
}

export function setPinned(uid: string, chatId: string, pinned: boolean) {
  return setMembershipFlag(uid, chatId, "pinned", pinned);
}
