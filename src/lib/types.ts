/* ═══════════════════════════════════════════════════════════════
   Supabase (Postgres + Realtime) shapes
   ═══════════════════════════════════════════════════════════════ */

export type PresenceState = "online" | "away" | "busy" | "offline";

export interface UserSettings {
  theme: "aurora" | "ember" | "mint" | "noir" | "dark";
  accent: "azure" | "slate" | "teal" | "gold";
  enterToSend: boolean;
  readReceipts: boolean;
  typingIndicator: boolean;
  messageSounds: boolean;
  desktopNotifications: boolean;
  compactMode: boolean;
  language: string;
}

export interface OmiUser {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string;
  phone?: string;
  createdAt: number;
  lastSeen: number;
  presence: PresenceState;
  statusText: string;
  settings?: Partial<UserSettings>;
  /** uid -> true. Blocking is enforced on read paths. */
  blocked?: Record<string, boolean>;
  pinnedChats?: Record<string, true>;
  mutedChats?: Record<string, true>;
  /** chatId -> messageId[] of starred messages */
  starredMessages?: Record<string, string[]>;
}

export type MessageKind = "text" | "image" | "file" | "audio" | "system" | "call";

/** emoji -> uid[] */
export type MessageReactions = Record<string, string[]>;

export interface OmiMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  kind: MessageKind;
  createdAt: number;
  /** URL for image/file/audio attachments (Supabase Storage). */
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  /** Duration in seconds for audio messages */
  audioDuration?: number | null;
  replyTo?: { id: string; text: string; senderName: string } | null;
  editedAt?: number | null;
  deleted?: boolean;
  /** ephemeral, never persisted */
  status?: "sending" | "sent" | "failed";
  /** Emoji reactions: emoji → array of UIDs who reacted */
  reactions?: MessageReactions;
  /** Whether this message was forwarded */
  forwarded?: boolean;
  /** Client-only: starred by current user */
  starred?: boolean;
  /** Seconds after reading before the message disappears (0 = never) */
  disappearAfter?: number | null;
}

export type ChatKind = "direct" | "group";

export interface OmiChat {
  id: string;
  kind: ChatKind;
  /** uid -> true */
  members: Record<string, true>;
  /** uid -> true (admins, group only) */
  admins?: Record<string, true>;
  title: string;
  avatarUrl: string | null;
  createdBy: string;
  createdAt: number;
  lastMessage: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    kind: MessageKind;
    createdAt: number;
  } | null;
  /**
   * uid -> epoch ms of each member's read cursor.
   * Replaces the old per-message readBy map: a message is read when a peer's
   * cursor is at or past its createdAt.
   */
  readCursors?: Record<string, number>;
  /** Messages from other members newer than my own read cursor. */
  unread?: number;
  /** Optional background: CSS color, gradient, or storage URL */
  wallpaper?: string | null;
}

export type CallStatus =
  | "ringing"
  | "connecting"
  | "active"
  | "reconnecting"
  | "declined"
  | "missed"
  | "ended"
  | "busy";

export interface CallRecord {
  id: string;
  kind: "audio" | "video";
  chatId: string | null;
  members: Record<string, true>;
  initiatedBy: string;
  createdAt: number;
  answeredAt: number | null;
  endedAt: number | null;
  endReason: CallStatus | null;
  /**
   * SDP offers and ICE candidates are NOT stored here — they ride on a
   * Realtime Broadcast channel for the duration of the call. This field is
   * kept for the shape but is always empty.
   */
}

export interface SignalMessage {
  /** Unique id used to de-duplicate re-delivered signals */
  id: string;
  from: string;
  kind: "offer" | "answer" | "candidate" | "hangup" | "media" | "ping";
  payload?: unknown;
  at: number;
}

/** Every watch* function returns one of these. */
export type UnsubscribeFn = () => void;

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "aurora",
  accent: "azure",
  enterToSend: true,
  readReceipts: true,
  typingIndicator: true,
  messageSounds: true,
  desktopNotifications: false,
  compactMode: false,
  language: "en",
};

/* ═══════════════════════════════════════════════════════════════
   Call log entry (stored per-user)
   ═══════════════════════════════════════════════════════════════ */

export interface CallLogEntry {
  id: string;
  peerId: string;
  peerName: string;
  kind: "audio" | "video";
  direction: "outgoing" | "incoming";
  status: CallStatus;
  startedAt: number;
  durationSec: number;
}

/* ═══════════════════════════════════════════════════════════════
   Starred message reference (cross-chat)
   ═══════════════════════════════════════════════════════════════ */

export interface StarredMessageRef {
  messageId: string;
  chatId: string;
  chatTitle: string;
  text: string;
  senderName: string;
  kind: MessageKind;
  createdAt: number;
}