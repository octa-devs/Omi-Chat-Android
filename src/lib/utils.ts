import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ── time ─────────────────────────────────────────────────── */

export function formatTime(ts: number | string | Date) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOfDay(today) - startOfDay(d)) / 86_400_000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  if (d.getFullYear() === today.getFullYear())
    return d.toLocaleDateString([], { month: "long", day: "numeric" });
  return d.toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatLastSeen(ts?: number) {
  if (!ts) return "Offline";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Last seen just now";
  if (diff < 3_600_000) return `Last seen ${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `Last seen ${Math.floor(diff / 3_600_000)}h ago`;
  return `Last seen ${formatDayLabel(ts)}`;
}

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/**
 * Bug #8 Fix: was always dividing by 1024 and labelling "KB",
 * so a 12 MB file showed as "12288 KB". Now correctly formats KB/MB/GB.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/* ── text ─────────────────────────────────────────────────── */

export function initials(name?: string | null, fallback = "OM") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic hue from a string — used for generated avatars. */
export function hueFromString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function isSameDay(a: number, b: number) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/* ── ids ──────────────────────────────────────────────────── */

/**
 * Stable, deterministic id for a 1:1 conversation between two uids.
 * Sorting guarantees both participants resolve to the same room.
 */
export function directChatId(uidA: string, uidB: string) {
  return [uidA, uidB].sort().join("__");
}

/** Random readable call room id, e.g. `omi-7f3k-92qx` */
export function makeCallId() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const chunk = (n: number) =>
    Array.from(
      { length: n },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
  return `omi-${chunk(4)}-${chunk(4)}`;
}

/* ── validation ───────────────────────────────────────────── */

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function usernameProblem(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (v.length < 3) return "At least 3 characters.";
  if (v.length > 20) return "At most 20 characters.";
  if (!USERNAME_RE.test(v))
    return "Only lowercase letters, numbers and underscores.";
  return null;
}

export function passwordProblem(value: string): string | null {
  if (value.length < 6) return "At least 6 characters.";
  return null;
}

/**
 * Turn a thrown Supabase/Postgres error into something worth showing a user.
 *
 * Supabase surfaces auth failures as human-readable messages ("Invalid login
 * credentials") rather than the coded strings Firebase used, so the map covers
 * both shapes: coded keys for Postgres/RLS, plus substring fallbacks for the
 * auth messages that have no code at all.
 */
export function errorMessage(e: unknown) {
  const code =
    typeof e === "object" && e && "code" in e
      ? String((e as { code: string }).code)
      : "";
  const message = e instanceof Error ? e.message : "";

  const map: Record<string, string> = {
    // Supabase auth + Postgres
    "23505": "That @username is already taken.",
    "23503": "That user no longer exists.",
    "23514": "That value isn't allowed.",
    "42501": "You don't have permission to do that.",
    "PGRST116": "Not found.",
    "PGRST301": "Sign in to continue.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found with those details.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/invalid-login-credentials":
      "Incorrect email or password. Try again.",
    "auth/email-already-in-use": "That email is already registered.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/popup-closed-by-user": "Sign-in popup was closed.",
    "auth/popup-blocked": "Sign-in popup was blocked by the browser.",
    "auth/requires-recent-login": "Please sign in again to continue.",
    "PERMISSION_DENIED": "You don't have permission to do that.",
    "unavailable": "Can't reach the server. Check your connection.",
  };

  if (map[code]) return map[code];

  // No code to work with, so fall back to matching the message Supabase sends.
  const lower = message.toLowerCase();
  const phrases: Array<[RegExp, string]> = [
    [/invalid login credentials/, "Incorrect email or password."],
    [/email not confirmed/, "Confirm your email address first."],
    [/user already registered/, "That email is already registered."],
    [/email address .* invalid|invalid email/, "That email address doesn't look right."],
    [/password should be at least/, "Password must be at least 6 characters."],
    // OTP verification. Supabase returns this one string for both a wrong code
    // and an expired one, so the copy has to cover both without guessing.
    [
      /token has expired or is invalid|invalid token|token is invalid/,
      "That code is wrong or has expired. Request a new one.",
    ],
    [
      /email rate limit|over_email_send_rate_limit|too many emails/,
      "Too many emails requested. Wait a minute, then try again.",
    ],
    [/rate limit|too many requests/, "Too many attempts. Please wait a moment."],
    [/row-level security|permission denied/, "You don't have permission to do that."],
    [/failed to fetch|network/i, "Can't reach the server. Check your connection."],
  ];
  for (const [re, friendly] of phrases) {
    if (re.test(lower)) return friendly;
  }

  return message || "Something went wrong. Please retry.";
}

/* ── misc ─────────────────────────────────────────────────── */

export function uid() {
  return (
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  );
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}