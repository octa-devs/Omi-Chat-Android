import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./client";
import { onTable, openEphemeral, publish, dropChannel } from "./realtime";
import { ts } from "./rows";
import { makeCallId } from "../utils";
import type { CallLogEntry, CallRecord, CallStatus } from "../types";

/**
 * Calls: ringing state and the log are durable rows; the WebRTC handshake is not.
 *
 * The Firebase version wrote every SDP offer, every answer and every ICE
 * candidate into the database, then deleted them on hangup. ICE candidates
 * arrive several times a second, so a two-minute call meant hundreds of writes
 * and a read-modify-write on the critical path of connection setup. Here the
 * handshake rides a Realtime Broadcast channel — one websocket hop — and the
 * database is only told the call exists and how it ended.
 */

/* ── rows ─────────────────────────────────────────────────── */

interface CallRow {
  id: string;
  kind: "audio" | "video";
  chat_id: string | null;
  state: "ringing" | "active" | "ended";
  initiated_by: string;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
  call_members: Array<{ user_id: string }> | null;
}

function rowToCall(r: CallRow): CallRecord {
  const members: Record<string, true> = {};
  for (const m of r.call_members ?? []) members[m.user_id] = true;

  return {
    id: r.id,
    kind: r.kind,
    chatId: r.chat_id,
    members,
    initiatedBy: r.initiated_by,
    createdAt: ts(r.created_at),
    answeredAt: r.answered_at ? ts(r.answered_at) : null,
    endedAt: r.ended_at ? ts(r.ended_at) : null,
    endReason: (r.end_reason as CallStatus) ?? null,
  };
}

const CALL_SELECT = "*, call_members(user_id)";

export interface CallRingEntry extends CallRecord {
  direction: "incoming" | "outgoing";
  peerId: string;
  peerName: string;
  status: "ringing" | "active";
}

/** call_members joined to its parent call — the shape the ring UI needs. */
interface RingJoin {
  direction: "incoming" | "outgoing";
  peer_id: string | null;
  peer_name: string;
  status: "ringing" | "active" | "ended";
  answered_at: string | null;
  calls: {
    id: string;
    kind: "audio" | "video";
    chat_id: string | null;
    state: "ringing" | "active" | "ended";
    initiated_by: string;
    created_at: string;
  } | null;
}

const RING_SELECT =
  "direction, peer_id, peer_name, status, answered_at, " +
  "calls!inner(id, kind, chat_id, state, initiated_by, created_at)";

function joinToRing(r: RingJoin): CallRingEntry {
  const c = r.calls;
  return {
    id: c?.id ?? "",
    kind: c?.kind ?? "audio",
    chatId: c?.chat_id ?? null,
    members: {
      ...(c?.initiated_by ? { [c.initiated_by]: true } : {}),
      ...(r.peer_id ? { [r.peer_id]: true } : {}),
    },
    initiatedBy: c?.initiated_by ?? "",
    createdAt: ts(c?.created_at),
    answeredAt: r.answered_at ? ts(r.answered_at) : null,
    endedAt: null,
    endReason: null,
    direction: r.direction,
    peerId: r.peer_id ?? "",
    peerName: r.peer_name,
    status: r.status === "ended" ? "ringing" : r.status,
  };
}

/* ── read ─────────────────────────────────────────────────── */

export async function getCall(callId: string): Promise<CallRecord | null> {
  const { data, error } = await getSupabase()
    .from("calls")
    .select(CALL_SELECT)
    .eq("id", callId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToCall(data as unknown as CallRow) : null;
}

export function watchCall(
  callId: string,
  cb: (call: CallRecord | null) => void,
): () => void {
  let alive = true;

  const refresh = async () => {
    const fresh = await getCall(callId).catch(() => null);
    if (alive) cb(fresh);
  };

  void refresh();
  const off = onTable("calls", () => void refresh(), { column: "id", value: callId });

  return () => {
    alive = false;
    off();
  };
}

/** Live list of ringing calls for a user, newest first. */
export function watchCallRing(
  uid: string,
  cb: (entries: CallRingEntry[]) => void,
): () => void {
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const refresh = async () => {
    const { data, error } = await getSupabase()
      .from("call_members")
      .select(RING_SELECT)
      .eq("user_id", uid)
      .eq("status", "ringing");
    if (!alive) return;
    if (error || !data) {
      cb([]);
      return;
    }

    const now = Date.now();
    const validRows: RingJoin[] = [];
    const staleCallIds: string[] = [];

    for (const r of (data as unknown as RingJoin[])) {
      const callState = r.calls?.state;
      const callTime = r.calls?.created_at ? ts(r.calls.created_at) : 0;
      // Stale if the call was marked ended, or if ringing for more than 45s without answer
      const isStale =
        callState === "ended" ||
        (now - callTime > 45_000 && !r.answered_at);

      if (isStale) {
        if (r.calls?.id) staleCallIds.push(r.calls.id);
      } else {
        validRows.push(r);
      }
    }

    // Auto-clean stale ringing rows in background so phantom calls never return
    if (staleCallIds.length > 0) {
      void (async () => {
        try {
          await getSupabase().from("call_members").update({ status: "ended" }).in("call_id", staleCallIds);
          await getSupabase().from("call_ring").delete().in("call_id", staleCallIds);
        } catch {
          // ignore
        }
      })();
    }

    const rows = validRows.map(joinToRing);
    cb(rows.sort((a, b) => b.createdAt - a.createdAt));
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void refresh(), 100);
  };

  void refresh();
  const off = onTable("call_ring", schedule, { column: "user_id", value: uid });

  // Fallback broadcast channel for immediate ringing even if table RLS delayed or blocked
  const ringBroadcast = getSupabase().channel(`call-ring:${uid}`);
  ringBroadcast
    .on("broadcast", { event: "ring" }, async (payload) => {
      const data = payload?.payload as
        | { callId?: string; callerId?: string; callerName?: string; kind?: "audio" | "video" }
        | undefined;
      if (data?.callId && data?.callerId && data.callerId !== uid) {
        try {
          await getSupabase().from("call_members").upsert({
            call_id: data.callId,
            user_id: uid,
            peer_id: data.callerId,
            peer_name: data.callerName ?? "Caller",
            direction: "incoming",
            status: "ringing",
          });
        } catch {
          // ignore
        }
      }
      schedule();
    })
    .subscribe();

  return () => {
    alive = false;
    if (timer) clearTimeout(timer);
    off();
    void getSupabase().removeChannel(ringBroadcast);
  };
}

/**
 * One-shot ring lookup for a single call.
 *
 * Synchronous unsubscribe by design: the caller is a mount effect, and handing
 * back a Promise would leave a window where unmount happens before the channel
 * or query is torn down. There is nothing to tear down here anyway.
 */
export function watchCallRingEntry(
  uid: string,
  callId: string,
  cb: (entry: CallRingEntry | null) => void,
): () => void {
  let alive = true;

  void (async () => {
    const { data, error } = await getSupabase()
      .from("call_members")
      .select(RING_SELECT)
      .eq("call_id", callId)
      .eq("user_id", uid)
      .maybeSingle();
    if (!alive) return;
    if (error || !data) {
      cb(null);
      return;
    }
    cb(joinToRing(data as unknown as RingJoin));
  })();

  return () => {
    alive = false;
  };
}

export function watchCallLogs(
  uid: string,
  cb: (entries: CallLogEntry[]) => void,
): () => void {
  let alive = true;

  const refresh = async () => {
    const { data, error } = await getSupabase()
      .from("call_logs")
      .select("*")
      .eq("user_id", uid)
      .order("started_at", { ascending: false })
      .limit(100);
    if (!alive) return;
    if (error) {
      cb([]);
      return;
    }
    cb((data as unknown as CallLogDb[]).map(rowToLog));
  };

  void refresh();
  const off = onTable("call_logs", () => void refresh(), {
    column: "user_id",
    value: uid,
  });

  return () => {
    alive = false;
    off();
  };
}

interface CallLogDb {
  call_id: string;
  peer_id: string | null;
  peer_name: string;
  kind: "audio" | "video";
  direction: "incoming" | "outgoing";
  status: string;
  started_at: string;
  duration_sec: number;
}

function rowToLog(r: CallLogDb): CallLogEntry {
  return {
    id: r.call_id,
    peerId: r.peer_id ?? "",
    peerName: r.peer_name,
    kind: r.kind,
    direction: r.direction,
    status: r.status as CallStatus,
    startedAt: ts(r.started_at),
    durationSec: r.duration_sec,
  };
}

/* ── write ────────────────────────────────────────────────── */

export async function placeCall(input: {
  callerId: string;
  callerName: string;
  peerId: string;
  peerName: string;
  kind: "audio" | "video";
  chatId: string | null;
  callId?: string;
}): Promise<string> {
  if (input.peerId === input.callerId) {
    throw new Error("You cannot start a call with yourself.");
  }
  const supabase = getSupabase();
  const callId = input.callId ?? makeCallId();

  // 1. Try atomic create_call RPC if migration 0002 has been executed
  try {
    const { error: rpcError } = await supabase.rpc("create_call", {
      p_call_id: callId,
      p_kind: input.kind,
      p_chat_id: input.chatId ?? null,
      p_peer_id: input.peerId,
      p_peer_name: input.peerName,
      p_caller_name: input.callerName,
    });
    if (!rpcError) {
      broadcastRing(supabase, input.peerId, {
        callId,
        callerId: input.callerId,
        callerName: input.callerName,
        kind: input.kind,
      });
      return callId;
    }
  } catch {
    // Proceed to standard inserts
  }

  // 2. Direct inserts with RLS error resilience
  const { error: callError } = await supabase.from("calls").insert({
    id: callId,
    kind: input.kind,
    chat_id: input.chatId,
    state: "ringing",
    initiated_by: input.callerId,
  });
  if (callError && callError.code !== "23505") {
    if (callError.code === "23503") {
      // Foreign key fallback without chat_id
      await supabase.from("calls").insert({
        id: callId,
        kind: input.kind,
        chat_id: null,
        state: "ringing",
        initiated_by: input.callerId,
      });
    } else {
      console.warn("calls insert warning:", callError.message);
    }
  }

  // 3. Caller's own membership row (user_id = auth.uid(), never blocked by RLS)
  try {
    await supabase.from("call_members").upsert({
      call_id: callId,
      user_id: input.callerId,
      peer_id: input.peerId,
      peer_name: input.peerName,
      direction: "outgoing",
      status: "ringing",
    });
  } catch (err) {
    console.warn("Caller membership insert warning:", err);
  }

  // 4. Peer membership row (attempt insert, but don't fail call if RLS rejects)
  try {
    const { error: peerMemErr } = await supabase.from("call_members").insert({
      call_id: callId,
      user_id: input.peerId,
      peer_id: input.callerId,
      peer_name: input.callerName,
      direction: "incoming",
      status: "ringing",
    });
    if (peerMemErr && peerMemErr.code !== "23505") {
      console.warn("Peer membership insert warning:", peerMemErr.message);
    }
  } catch (err) {
    console.warn("Peer membership insert note:", err);
  }

  // 5. Call ring rows (caller and peer)
  try {
    await supabase.from("call_ring").upsert({
      call_id: callId,
      user_id: input.callerId,
    });
    await supabase.from("call_ring").insert({
      call_id: callId,
      user_id: input.peerId,
    });
  } catch (err) {
    console.warn("call_ring insert warning:", err);
  }

  // 6. Broadcast incoming ring notification
  broadcastRing(supabase, input.peerId, {
    callId,
    callerId: input.callerId,
    callerName: input.callerName,
    kind: input.kind,
  });

  return callId;
}

function broadcastRing(
  supabase: ReturnType<typeof getSupabase>,
  peerId: string,
  payload: { callId: string; callerId: string; callerName: string; kind: "audio" | "video" },
) {
  try {
    const ringChannel = supabase.channel(`call-ring:${peerId}`);
    ringChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void ringChannel.send({
          type: "broadcast",
          event: "ring",
          payload,
        });
      }
    });
  } catch (err) {
    console.warn("call-ring broadcast warning:", err);
  }
}

export async function acceptCall(callId: string, uid: string) {
  const supabase = getSupabase();
  const at = new Date().toISOString();

  const { error } = await supabase
    .from("calls")
    .update({ answered_at: at, state: "active" })
    .eq("id", callId);
  if (error) throw error;

  const { error: memberError } = await supabase
    .from("call_members")
    .update({ status: "active", answered_at: at })
    .eq("call_id", callId)
    .eq("user_id", uid);
  if (memberError) throw memberError;

  // The callee has stopped ringing. The caller has not.
  const { error: ringError } = await supabase
    .from("call_ring")
    .delete()
    .eq("call_id", callId)
    .eq("user_id", uid);
  if (ringError) throw ringError;
}

export async function endCall(callId: string, byUser: string, reason: CallStatus) {
  const supabase = getSupabase();
  const endedAt = new Date().toISOString();
  void byUser;

  // `kind` and `created_at` live on calls, not call_members, so they come from
  // the joined parent. Without the join PostgREST rejects the select outright
  // and no log row is ever written.
  const { data, error: membersError } = await supabase
    .from("call_members")
    .select("user_id, peer_id, peer_name, direction, answered_at, calls!inner(kind, created_at)")
    .eq("call_id", callId);

  // A missing log is not worth failing a hangup over — the call is already
  // over as far as the UI is concerned.
  if (membersError) console.warn("call_members read failed on endCall", membersError);

  await supabase
    .from("calls")
    .update({ state: "ended", ended_at: endedAt, end_reason: reason })
    .eq("id", callId);

  await supabase
    .from("call_members")
    .update({ status: "ended" })
    .eq("call_id", callId);

  // One log row per participant, derived from that participant's own view of the
  // call, so both sides get the right direction and duration. A call that was
  // never answered has no per-member answered_at, so it falls back to when the
  // call was placed.
  const rows = (data ?? []) as unknown as Array<{
    user_id: string;
    peer_id: string | null;
    peer_name: string;
    direction: "incoming" | "outgoing";
    answered_at: string | null;
    calls: { kind: "audio" | "video"; created_at: string } | null;
  }>;

  const logs = rows.map((m) => {
    const startedAt = m.answered_at ?? m.calls?.created_at ?? endedAt;
    return {
      user_id: m.user_id,
      call_id: callId,
      peer_id: m.peer_id,
      peer_name: m.peer_name,
      kind: m.calls?.kind ?? "audio",
      direction: m.direction,
      status: reason,
      started_at: startedAt,
      duration_sec: Math.max(0, Math.round((ts(endedAt) - ts(startedAt)) / 1000)),
    };
  });

  if (logs.length) {
    const { error } = await supabase.from("call_logs").insert(logs);
    if (error && error.code !== "23505") {
      console.warn("call_logs insert failed", error);
    }
  }

  try {
    await supabase.from("call_ring").delete().eq("call_id", callId);
  } catch {
    // ignore
  }
  await clearSignals(callId);
}

/* ── WebRTC signalling over a broadcast channel ───────────── */

export type SignalKind = "offer" | "answer" | "candidate" | "hangup" | "media" | "ping";

export interface SignalEnvelope {
  id: string;
  from: string;
  to: string;
  kind: SignalKind;
  payload: unknown;
  at: number;
}

const signalChannels = new Map<string, Promise<RealtimeChannel>>();
const signalSubs = new Map<string, Set<(e: SignalEnvelope) => void>>();

/**
 * One shared channel per call, fanned out to every local listener.
 *
 * sendSignal and watchSignals MUST resolve to the same topic — they are the two
 * ends of one socket. A per-listener channel here would mean publishing on
 * `call:{id}` while listening on `call:{id}:{to}`, and nothing would ever arrive.
 */
function signalChannel(callId: string): Promise<RealtimeChannel> {
  let pending = signalChannels.get(callId);
  if (!pending) {
    pending = openEphemeral(`call:${callId}`, {
      signal: (body) => {
        const env = body as SignalEnvelope;
        for (const fn of signalSubs.get(callId) ?? []) fn(env);
      },
    });
    signalChannels.set(callId, pending);
  }
  return pending;
}

/**
 * Send one signalling payload.
 *
 * `from`/`to` travel in the envelope so a single shared channel serves both
 * peers without either subscribing to a private one. Broadcast is
 * fire-and-forget: a message published before the peer has joined the channel is
 * lost. That is survivable — the offer is renegotiated on the
 * connecting/reconnecting phases and ICE is re-gathered by restartIce.
 */
export async function sendSignal(
  callId: string,
  from: string,
  to: string,
  kind: SignalKind,
  payload?: unknown,
) {
  const ch = await signalChannel(callId);
  await publish(ch, "signal", {
    id: `${from}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from,
    to,
    kind,
    payload: payload ?? null,
    at: Date.now(),
  } satisfies SignalEnvelope);
}

/** Listen for signalling addressed to `to`. */
export function watchSignals(
  callId: string,
  to: string,
  cb: (msg: SignalEnvelope) => void,
): () => void {
  const set = signalSubs.get(callId) ?? new Set<(e: SignalEnvelope) => void>();
  const fn = (env: SignalEnvelope) => {
    if (env?.to === to) cb(env);
  };
  set.add(fn);
  signalSubs.set(callId, set);
  void signalChannel(callId);

  return () => {
    set.delete(fn);
    if (set.size) return;
    const pending = signalChannels.get(callId);
    signalChannels.delete(callId);
    signalSubs.delete(callId);
    if (pending) void pending.then(dropChannel);
  };
}

export async function clearSignals(callId: string) {
  const pending = signalChannels.get(callId);
  signalChannels.delete(callId);
  signalSubs.delete(callId);
  if (pending) await dropChannel(await pending);
}

export type RingRow = CallRingEntry;

export const watchIncomingCalls = watchCallRing;

export async function initiateCall(
  callerId: string,
  peerId: string,
  kind: "audio" | "video",
  chatId: string | null,
): Promise<string> {
  return placeCall({
    callerId,
    callerName: "Caller",
    peerId,
    peerName: "Peer",
    kind,
    chatId,
  });
}

export async function declineCall(callId: string, uid: string) {
  return endCall(callId, uid, "declined");
}

