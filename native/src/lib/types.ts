/* ═══════════════════════════════════════════════════════════════
   Supabase (Postgres + Realtime) shapes
   ═══════════════════════════════════════════════════════════════ */

export type PresenceState = "online" | "away" | "busy" | "offline";

export interface UserSettings {
  theme: "aurora" | "ember" | "mint" | "noir" | "dark" | "system" | "light";
  accent: "azure" | "slate" | "teal" | "gold" | "amber";
  enterToSend: boolean;
  readReceipts: boolean;
  typingIndicator: boolean;
  messageSounds: boolean;
  soundEnabled?: boolean;
  desktopNotifications: boolean;
  compactMode: boolean;
  language: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "aurora",
  accent: "azure",
  enterToSend: true,
  readReceipts: true,
  typingIndicator: true,
  messageSounds: true,
  soundEnabled: true,
  desktopNotifications: true,
  compactMode: false,
  language: "en",
};

export type AccentName = UserSettings["accent"];
export type ThemePreference = "system" | "light" | "dark";

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
  senderAvatar?: string | null;
  text: string;
  kind: MessageKind;
  createdAt: number;
  /** URL for image/file/audio attachments (Supabase Storage). */
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  /** Aliases for media attachments */
  mediaUrl?: string | null;
  mediaName?: string | null;
  mediaSize?: number | null;
  /** Duration in seconds for audio messages */
  audioDuration?: number | null;
  replyTo?: { id: string; text: string; senderName: string } | null;
  editedAt?: number | null;
  deleted?: boolean;
  /** ephemeral / delivery status */
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
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
  /** uid -> true or member object */
  members: Record<string, any>;
  /** uid -> true (admins, group only) */
  admins?: Record<string, true>;
  title: string;
  avatarUrl: string | null;
  createdBy: string;
  createdAt: number;
  unreadCount?: number;
  isOnline?: boolean;
  lastMessage: {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    kind: MessageKind;
    createdAt: number;
  } | null;
  readCursors?: Record<string, number>;
}

export type CallStatus =
  | "ringing"
  | "active"
  | "ended"
  | "missed"
  | "declined"
  | "busy"
  | "failed"
  | "canceled"
  | "completed";

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
}

export interface CallLogEntry {
  id: string;
  peerId: string;
  peerName: string;
  kind: "audio" | "video";
  direction: "incoming" | "outgoing";
  status: CallStatus;
  startedAt: number;
  durationSec: number;
}