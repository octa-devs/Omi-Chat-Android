import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./client";

/**
 * Realtime plumbing.
 *
 * Two transports, split by what the data actually is:
 *
 *   postgres_changes — durable rows. Messages, chats, the call ring.
 *                      Survives a reload, respects RLS.
 *   broadcast        — ephemeral state. Typing, mic state, SDP/ICE candidates.
 *                      Never touches the database, so an ICE candidate is one
 *                      websocket hop instead of a read + write + read.
 *
 * The Firebase version had neither split: everything was a database write,
 * including things that were thrown away seconds later.
 */

let seq = 0;
const uniq = () => `c${++seq}-${Math.random().toString(36).slice(2, 8)}`;

/** Dispose of a channel without letting a double-teardown throw. */
export async function dropChannel(ch: RealtimeChannel): Promise<void> {
  try {
    await getSupabase().removeChannel(ch);
  } catch {
    /* already detached */
  }
}

export interface ChangePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

/**
 * Watch a table. `filter` must be a simple equality column — that is all
 * Supabase Realtime can filter on, so anything richer has to be filtered in
 * the handler.
 */
export function onTable(
  table: string,
  handler: (payload: ChangePayload) => void,
  filter?: { column: string; value: string | number },
): () => void {
  const ch = getSupabase()
    .channel(uniq())
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
      },
      (p) => handler(p as ChangePayload),
    )
    .subscribe();

  return () => {
    void dropChannel(ch);
  };
}

/** Map of broadcast event name → handler. */
export type EphemeralHandlers = Record<string, (body: unknown) => void>;

/**
 * Open a pub/sub channel for ephemeral state.
 *
 * The caller owns the returned channel: it must call `dropChannel` on teardown.
 * `self: false` means a sender never receives its own broadcast, so handlers
 * do not have to filter out their own messages.
 */
export async function openEphemeral(
  topic: string,
  handlers: EphemeralHandlers,
  track?: Record<string, unknown>,
): Promise<RealtimeChannel> {
  const supabase = getSupabase();
  // Topic must be shared across all clients so broadcasts reach peers
  const ch = supabase.channel(topic, {
    config: { broadcast: { self: false, ack: false } },
  });

  for (const [event, cb] of Object.entries(handlers)) {
    ch.on("broadcast", { event }, ({ payload }) => cb(payload));
  }

  if (track) void ch.track(track);

  await new Promise<void>((resolve) => {
    ch.subscribe((s) => {
      if (s === "SUBSCRIBED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT") resolve();
    });
  });

  return ch;
}

/** Fire-and-forget publish. Realtime has no delivery guarantee — see calls.ts. */
export async function publish(
  ch: RealtimeChannel,
  event: string,
  body: unknown,
): Promise<void> {
  await ch.send({ type: "broadcast", event, payload: { body } });
}
