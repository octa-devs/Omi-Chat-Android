import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./client";
import { onTable, openEphemeral, publish, dropChannel } from "./realtime";
import { rowToChat, rowToMessage, type ChatRow, type MessageRow } from "./rows";
import type { MessageKind, OmiChat, OmiMessage } from "../types";
import { directChatId } from "../utils";

/**
 * Chats, messages, the inbox, and attachments.
 *
 * Signature-compatible with the Firebase module it replaces.
 *
 * The big structural change: the Firebase version wrote each message to three
 * places (the chat tree, a per-user inbox mirror, and a per-user unread
 * counter) with no transaction spanning them. Here it is one INSERT and the
 * touch_chat() database trigger maintains the inbox preview.
 */

/* ── typing + media: broadcast, never persisted ────────────── */

interface TypingBody { uid: string; name: string | null }
type MediaState = "mic-on" | "mic-off" | "cam-on" | "cam-off" | null;
interface MediaBody { uid: string; state: MediaState }

const chatChannels = new Map<string, Promise<RealtimeChannel>>();
const typingSubs = new Map<string, Set<(t: TypingBody) => void>>();
const mediaSubs = new Map<string, Set<(m: MediaBody) => void>>();

/**
 * One ephemeral channel per chat, shared by every caller that needs it.
 * Held open until the last watcher releases it, so opening a conversation and
 * starting a call do not fight over the same topic.
 */
function chatChannel(chatId: string): Promise<RealtimeChannel> {
  let pending = chatChannels.get(chatId);
  if (!pending) {
    pending = openEphemeral(`chat:${chatId}`, {
      typing: (body) => {
        for (const fn of typingSubs.get(chatId) ?? []) fn(body as TypingBody);
      },
      media: (body) => {
        for (const fn of mediaSubs.get(chatId) ?? []) fn(body as MediaBody);
      },
    });
    chatChannels.set(chatId, pending);
  }
  return pending;
}

async function releaseChat(chatId: string) {
  if (typingSubs.get(chatId)?.size || mediaSubs.get(chatId)?.size) return;
  const pending = chatChannels.get(chatId);
  chatChannels.delete(chatId);
  typingSubs.delete(chatId);
  mediaSubs.delete(chatId);
  if (pending) await dropChannel(await pending);
}

/* ── reads ────────────────────────────────────────────────── */

export async function getChat(chatId: string): Promise<OmiChat | null> {
  const { data, error } = await getSupabase().rpc("get_chat", {
    target_chat: chatId,
  });
  if (error) throw error;
  const row = (data as ChatRow[])[0];
  return row ? rowToChat(row) : null;
}

interface RawJoinedMessage extends MessageRow {
  profiles: { display_name: string | null; username: string } | null;
}

function rowToJoinedMessage(r: RawJoinedMessage): OmiMessage {
  return rowToMessage({
    ...r,
    sender_name: r.profiles?.display_name || r.profiles?.username || null,
  });
}

const MESSAGE_SELECT = "*, profiles!messages_sender_id_fkey(display_name, username)";

export async function getMessages(chatId: string, limit = 200): Promise<OmiMessage[]> {
  // Descending + limit, then reverse: this asks the index for the newest N
  // rather than fetching everything and slicing, which is what the Firebase
  // limitToLast() did.
  const { data, error } = await getSupabase()
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data as unknown as RawJoinedMessage[]).map(rowToJoinedMessage).reverse();
}

/* ── live subscriptions ───────────────────────────────────── */

export function watchInbox(
  uid: string,
  cb: (chats: OmiChat[]) => void,
): () => void {
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const refresh = async () => {
    const { data, error } = await getSupabase().rpc("get_inbox");
    if (!alive) return;
    cb(error ? [] : (data as ChatRow[]).map(rowToChat));
  };

  // Coalesce bursts: five messages arriving together should cost one read.
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void refresh(), 120);
  };

  void refresh();

  // A chats UPDATE is the touch_chat trigger bumping last_activity, so this
  // fires for new activity in any of my chats without watching every message.
  const offChats = onTable("chats", schedule);
  const offMembership = onTable("chat_members", schedule, {
    column: "user_id",
    value: uid,
  });

  return () => {
    alive = false;
    if (timer) clearTimeout(timer);
    offChats();
    offMembership();
  };
}

export function watchChat(
  chatId: string,
  cb: (chat: OmiChat | null) => void,
): () => void {
  let alive = true;

  const refresh = async () => {
    const fresh = await getChat(chatId).catch(() => null);
    if (alive) cb(fresh);
  };

  void refresh();
  const off = onTable("chats", () => void refresh(), { column: "id", value: chatId });

  return () => {
    alive = false;
    off();
  };
}

export function watchMessages(
  chatId: string,
  limit: number,
  cb: (messages: OmiMessage[]) => void,
): () => void {
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const refresh = async () => {
    const next = await getMessages(chatId, limit).catch(() => []);
    if (alive) cb(next);
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void refresh(), 80);
  };

  void refresh();
  const off = onTable("messages", schedule, { column: "chat_id", value: chatId });

  return () => {
    alive = false;
    if (timer) clearTimeout(timer);
    off();
  };
}

/**
 * Live typing state.
 *
 * Broadcast rather than a database write: typing is high-frequency, worthless
 * after a few seconds, and the Firebase version persisted every keystroke and
 * cleaned up with onDisconnect.
 */
export function watchTyping(
  chatId: string,
  cb: (who: string[]) => void,
): () => void {
  const latest = new Map<string, { name: string; at: number }>();
  const set = typingSubs.get(chatId) ?? new Set<(t: TypingBody) => void>();

  const emit = () => {
    const cutoff = Date.now() - 4000;
    for (const [uid, t] of latest) {
      if (t.at < cutoff) latest.delete(uid);
    }
    cb([...latest.values()].map((t) => t.name).filter(Boolean));
  };

  const fn = (t: TypingBody) => {
    if (t.name) latest.set(t.uid, { name: t.name, at: Date.now() });
    else latest.delete(t.uid);
    emit();
  };

  set.add(fn);
  typingSubs.set(chatId, set);
  void chatChannel(chatId);

  // Sweep stale entries so a client that vanished mid-sentence clears itself.
  const sweeper = setInterval(emit, 2000);

  return () => {
    clearInterval(sweeper);
    set.delete(fn);
    void releaseChat(chatId);
  };
}

export async function setTyping(chatId: string, uid: string, name: string | null) {
  const ch = await chatChannel(chatId);
  await publish(ch, "typing", { uid, name, at: Date.now() });
}

export async function setMediaState(chatId: string, uid: string, state: MediaState) {
  const ch = await chatChannel(chatId);
  await publish(ch, "media", { uid, state });
}

export function watchMediaState(
  chatId: string,
  cb: (who: MediaBody) => void,
): () => void {
  const set = mediaSubs.get(chatId) ?? new Set<(m: MediaBody) => void>();
  const fn = (m: MediaBody) => cb(m);
  set.add(fn);
  mediaSubs.set(chatId, set);
  void chatChannel(chatId);

  return () => {
    set.delete(fn);
    void releaseChat(chatId);
  };
}

/* ── writes ───────────────────────────────────────────────── */

export async function sendMessage(input: {
  chat: OmiChat;
  senderId: string;
  senderName: string;
  text: string;
  kind?: MessageKind;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  replyTo?: { id: string; text: string; senderName: string } | null;
}): Promise<OmiMessage> {
  // One INSERT. The trigger moves the chat's last_activity, rebuilds the inbox
  // preview, and advances my own read cursor.
  const { data, error } = await getSupabase()
    .from("messages")
    .insert({
      chat_id: input.chat.id,
      sender_id: input.senderId,
      text: input.text.trim(),
      kind: input.kind ?? "text",
      attachment_url: input.attachmentUrl ?? null,
      attachment_name: input.attachmentName ?? null,
      attachment_size: input.attachmentSize ?? null,
      reply_to: input.replyTo ?? null,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) throw error;
  return rowToJoinedMessage(data as unknown as RawJoinedMessage);
}

export async function editMessage(chatId: string, messageId: string, text: string) {
  // touch_chat fires on UPDATE too, so the inbox preview stays honest.
  const { error } = await getSupabase()
    .from("messages")
    .update({ text: text.trim(), edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("chat_id", chatId);
  if (error) throw error;
}

export async function deleteMessage(chatId: string, messageId: string) {
  const { error } = await getSupabase()
    .from("messages")
    .update({
      text: "",
      attachment_url: null,
      attachment_name: null,
      deleted: true,
      edited_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("chat_id", chatId);
  if (error) throw error;
}

/** Clears the unread badge by moving this member's read cursor to now. */
export async function markChatRead(chatId: string, uid: string) {
  const { error } = await getSupabase()
    .from("chat_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("user_id", uid);
  if (error) throw error;
}

/**
 * @param _messageId kept for signature compatibility. Postgres tracks one read
 * cursor per member rather than a readBy map per message, so the id is unused
 * — the cursor just moves to now.
 */
export async function markMessageRead(chatId: string, _messageId: string, uid: string) {
  await markChatRead(chatId, uid);
}

/* ── conversations ────────────────────────────────────────── */

/**
 * Add membership rows in the only order the RLS policy accepts.
 *
 * The "members self-join on create" policy admits a row when
 *
 *   user_id = auth.uid()  or  is_chat_member(chat_id)
 *
 * and is_chat_member() is an existence check against chat_members. Postgres
 * evaluates WITH CHECK per row using the snapshot taken at the start of the
 * statement, so a row inserted earlier in the *same* INSERT is not yet
 * visible to it. Batching "me" and "the peer" into one statement therefore
 * always fails on the peer row — my membership does not exist yet at the
 * moment the peer's row is checked, and Postgres rejects the whole
 * statement with a permission error.
 *
 * Committing my own row first, in its own statement, means the next
 * statement's snapshot includes it. That is the flow the policy was written
 * for; the batch insert just did not match it.
 *
 * 23505 means the row is already there, which is the desired end state, so it
 * is swallowed rather than thrown.
 */
async function addMembers(
  chatId: string,
  meUid: string,
  others: string[],
  isAdmin: (index: number) => boolean,
) {
  const supabase = getSupabase();

  const mine = await supabase
    .from("chat_members")
    .insert({ chat_id: chatId, user_id: meUid, is_admin: isAdmin(0) });
  if (mine.error && mine.error.code !== "23505") throw mine.error;

  if (others.length === 0) return;

  const theirs = await supabase
    .from("chat_members")
    .insert(others.map((uid, i) => ({ chat_id: chatId, user_id: uid, is_admin: isAdmin(i + 1) })));
  if (theirs.error && theirs.error.code !== "23505") throw theirs.error;
}

export async function getOrCreateDirectChat(
  me: { uid: string; displayName: string; avatarUrl: string | null },
  peer: { uid: string; displayName: string; username?: string; avatarUrl: string | null },
): Promise<string> {
  const chatId = directChatId(me.uid, peer.uid);
  if (await getChat(chatId)) return chatId;

  const supabase = getSupabase();
  // 23505 here means either another tab won the race, or a previous attempt
  // created the chat and then failed before adding membership. Both are
  // recoverable: addMembers below is idempotent, and it repairs the second
  // case. Swallowing it is what stops that orphan from blocking this pair
  // permanently.
  const { error } = await supabase.from("chats").insert({
    id: chatId,
    kind: "direct",
    title: peer.displayName,
    avatar_url: peer.avatarUrl,
    created_by: me.uid,
  });
  if (error && error.code !== "23505") throw error;

  await addMembers(chatId, me.uid, [peer.uid], () => false);

  return chatId;
}

export async function createGroupChat(input: {
  me: { uid: string; displayName: string };
  title: string;
  members: Array<{ uid: string; displayName: string }>;
  avatarUrl?: string | null;
}): Promise<string> {
  const supabase = getSupabase();
  const chatId = `g_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const { error } = await supabase.from("chats").insert({
    id: chatId,
    kind: "group",
    title: input.title.trim() || "New group",
    avatar_url: input.avatarUrl ?? null,
    created_by: input.me.uid,
  });
  if (error) throw error;

  // Same ordering constraint as a direct chat: my own membership has to be
  // committed before the others can be authorised by is_chat_member().
  await addMembers(
    chatId,
    input.me.uid,
    input.members.map((m) => m.uid),
    (i) => i === 0,
  );

  return chatId;
}

export async function updateChatMeta(
  chatId: string,
  patch: Partial<Pick<OmiChat, "title" | "avatarUrl">>,
) {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.avatarUrl !== undefined) body.avatar_url = patch.avatarUrl;
  if (!Object.keys(body).length) return;

  const { error } = await getSupabase().from("chats").update(body).eq("id", chatId);
  if (error) throw error;
}

export async function leaveChat(chatId: string, uid: string) {
  const { error } = await getSupabase()
    .from("chat_members")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", uid);
  if (error) throw error;
}

export async function addChatMembers(
  chatId: string,
  newMembers: Array<{ uid: string; displayName: string }>,
) {
  const chat = await getChat(chatId);
  if (!chat) return;

  const fresh = newMembers.filter((m) => !chat.members[m.uid]);
  if (!fresh.length) return;

  const { error } = await getSupabase()
    .from("chat_members")
    .insert(fresh.map((m) => ({ chat_id: chatId, user_id: m.uid })));
  // 23505: already a member. Not a problem.
  if (error && error.code !== "23505") throw error;
}

/* ── attachments ──────────────────────────────────────────── */

const BUCKET = "attachments";

/**
 * Upload with real progress events.
 *
 * The SDK's .upload() is fetch-based and reports nothing until it finishes, but
 * the composer renders a progress bar. XHR is the only browser API that still
 * emits upload progress, so this talks to the Storage REST endpoint directly.
 * Auth is the caller's own access token — the publishable key cannot write.
 */
export async function uploadAttachment(
  uid: string,
  chatId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ url: string; name: string; size: number }> {
  const supabase = getSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const safeName = encodeURIComponent(file.name || "file");
  const path = `${uid}/${chatId}/${Date.now()}_${safeName}`;

  // Ask the server for a signed upload URL, then PUT straight to it.
  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (signError) throw signError;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signed.signedUrl, true);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Upload failed - network error."));
    xhr.send(file);
  });

  // The bucket is private, so hand out a signed read URL instead of a path.
  const { data: urlData, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (urlError) throw urlError;

  return { url: urlData.signedUrl, name: file.name, size: file.size };
}

/* ── reactions ────────────────────────────────────────────── */

/**
 * Toggle a reaction emoji on a message.
 * Reactions are stored as JSONB on the message row: { emoji: [uid, ...] }
 */
export async function reactToMessage(
  chatId: string,
  messageId: string,
  uid: string,
  emoji: string,
): Promise<void> {
  const { data, error: fetchErr } = await getSupabase()
    .from("messages")
    .select("reactions")
    .eq("id", messageId)
    .eq("chat_id", chatId)
    .single();
  if (fetchErr) throw fetchErr;

  const current = (data as { reactions: Record<string, string[]> | null }).reactions ?? {};
  const arr = current[emoji] ?? [];
  const idx = arr.indexOf(uid);
  let next: Record<string, string[]>;
  if (idx >= 0) {
    const newArr = arr.filter((u) => u !== uid);
    if (newArr.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [emoji]: _, ...rest } = current;
      next = rest;
    } else {
      next = { ...current, [emoji]: newArr };
    }
  } else {
    next = { ...current, [emoji]: [...arr, uid] };
  }

  const { error } = await getSupabase()
    .from("messages")
    .update({ reactions: next })
    .eq("id", messageId)
    .eq("chat_id", chatId);
  if (error) throw error;
}

/* ── audio messages ───────────────────────────────────────── */

/**
 * Upload a voice recording and send it as an audio message.
 */
export async function sendAudioMessage(input: {
  chat: OmiChat;
  senderId: string;
  senderName: string;
  audioBlob: Blob;
  durationSec: number;
  onProgress?: (pct: number) => void;
}): Promise<OmiMessage> {
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const fileName = `voice_${Date.now()}.webm`;
  const file = new File([input.audioBlob], fileName, { type: "audio/webm" });
  const path = `${input.senderId}/${input.chat.id}/${fileName}`;

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (signError) throw signError;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signed.signedUrl, true);
    xhr.setRequestHeader("authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", "audio/webm");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && input.onProgress) {
        input.onProgress((e.loaded / e.total) * 100);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Upload failed - network error."));
    xhr.send(file);
  });

  const { data: urlData, error: urlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (urlError) throw urlError;

  const durationSec = input.durationSec;
  return sendMessage({
    chat: input.chat,
    senderId: input.senderId,
    senderName: input.senderName,
    text: `Voice message (${Math.ceil(durationSec)}s)`,
    kind: "audio",
    attachmentUrl: urlData.signedUrl,
    attachmentName: fileName,
    attachmentSize: input.audioBlob.size,
  });
}

