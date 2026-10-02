import type { OmiChat, OmiMessage, OmiUser, UserSettings } from "../types";
import { DEFAULT_SETTINGS } from "../types";

/**
 * Row → shape adapters.
 *
 * The UI types (OmiUser / OmiChat / OmiMessage) predate the backend change and
 * every one of the ~15 components that consume them is left untouched. All
 * Postgres↔TypeScript friction is absorbed here: snake_case → camelCase,
 * timestamptz → epoch ms, and jsonb aggregates → the `Record<uid, true>` maps
 * the components already expect.
 */

/* ── primitives ───────────────────────────────────────────── */

/** timestamptz (or an ISO string, or ms) → epoch milliseconds. */
export function ts(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}

/* ── profiles  (public.get_profiles) ───────────────────────── */

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  status_text: string | null;
  presence: OmiUser["presence"];
  last_seen: string;
  settings: Partial<UserSettings> | null;
  created_at: string;
  blocked: Record<string, boolean> | null;
  pinned_chats: Record<string, true> | null;
  muted_chats: Record<string, true> | null;
}

export function rowToUser(r: ProfileRow): OmiUser {
  return {
    uid: r.id,
    username: r.username,
    displayName: r.display_name || r.username,
    // Email is deliberately not mirrored into profiles. auth.users owns it, and
    // profiles is readable by every signed-in user so search works.
    email: "",
    avatarUrl: r.avatar_url ?? null,
    bio: r.bio ?? "",
    createdAt: ts(r.created_at),
    lastSeen: ts(r.last_seen),
    presence: r.presence ?? "offline",
    statusText: r.status_text ?? "",
    settings: { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) },
    blocked: r.blocked ?? {},
    pinnedChats: r.pinned_chats ?? {},
    mutedChats: r.muted_chats ?? {},
  };
}

/**
 * For callers that only need scalar columns — search results, the insert
 * fallback. The maps default to empty, which is all those sites look at.
 */
export type SlimProfileRow = Omit<
  ProfileRow,
  "blocked" | "pinned_chats" | "muted_chats"
>;

export function slimToUser(r: SlimProfileRow): OmiUser {
  return rowToUser({
    ...r,
    blocked: null,
    pinned_chats: null,
    muted_chats: null,
  });
}

/* ── chats  (public.get_inbox / public.get_chat) ──────────── */

export interface ChatRow {
  id: string;
  kind: "direct" | "group";
  title: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  last_activity: string | null;
  last_message: OmiChat["lastMessage"] | null;
  members: Record<string, true> | null;
  unread: number | string | null;
  pinned: boolean | null;
  muted: boolean | null;
  last_read_at: string | null;
  read_cursors: Record<string, number> | null;
}

export function rowToChat(r: ChatRow): OmiChat {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title ?? "",
    avatarUrl: r.avatar_url ?? null,
    createdBy: r.created_by ?? "",
    createdAt: ts(r.created_at),
    members: r.members ?? {},
    lastMessage: r.last_message ?? null,
    unread: Number(r.unread ?? 0),
    readCursors: r.read_cursors ?? {},
  };
}

/* ── messages ──────────────────────────────────────────────── */

export interface MessageRow {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string | null;
  kind: OmiMessage["kind"];
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | string | null;
  reply_to: { id: string; text: string; senderName: string } | null;
  edited_at: string | null;
  deleted: boolean | null;
  created_at: string;
  sender_name: string | null;
}

export function rowToMessage(r: MessageRow): OmiMessage {
  return {
    id: r.id,
    chatId: r.chat_id,
    senderId: r.sender_id,
    senderName: r.sender_name ?? "Unknown",
    text: r.text ?? "",
    kind: r.kind,
    createdAt: ts(r.created_at),
    attachmentUrl: r.attachment_url ?? null,
    attachmentName: r.attachment_name ?? null,
    attachmentSize: r.attachment_size == null ? null : Number(r.attachment_size),
    replyTo: r.reply_to ?? null,
    editedAt: r.edited_at ? ts(r.edited_at) : null,
    deleted: r.deleted ?? false,
  };
}
