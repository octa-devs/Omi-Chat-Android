"use client";

import { useEffect, useRef, useState } from "react";
import {
  markChatRead,
  watchChat,
  watchInbox,
  watchMessages,
  watchTyping,
} from "@/lib/supabase/chats";
import type { OmiChat, OmiMessage } from "@/lib/types";

/* ── inbox ────────────────────────────────────────────────── */

export function useInbox(uid: string | null) {
  const [chats, setChats] = useState<OmiChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setChats([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unwatch = watchInbox(uid, (next) => {
      setChats(next);
      setLoading(false);
    });
    return unwatch;
  }, [uid]);

  return { chats, loading };
}

/* ── single chat ──────────────────────────────────────────── */

export function useChat(chatId: string | null) {
  const [chat, setChat] = useState<OmiChat | null>(null);
  const [loading, setLoading] = useState(Boolean(chatId));

  useEffect(() => {
    if (!chatId) {
      setChat(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unwatch = watchChat(chatId, (next) => {
      setChat(next);
      setLoading(false);
    });
    return unwatch;
  }, [chatId]);

  return { chat, loading };
}

/* ── messages ─────────────────────────────────────────────── */

export function useMessages(chatId: string | null, limit = 250) {
  const [messages, setMessages] = useState<OmiMessage[]>([]);
  const [loading, setLoading] = useState(Boolean(chatId));

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unwatch = watchMessages(chatId, limit, (next) => {
      setMessages(next);
      setLoading(false);
    });
    return unwatch;
  }, [chatId, limit]);

  return { messages, loading };
}

/* ── typing ───────────────────────────────────────────────── */

export function useTyping(chatId: string | null) {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    if (!chatId) {
      setNames([]);
      return;
    }
    return watchTyping(chatId, setNames);
  }, [chatId]);
  return names;
}

/* ── read receipts ────────────────────────────────────────── */

/**
 * Marks a conversation read whenever it is open and the tab is focused, and
 * clears the unread badge in the same pass.
 */
export function useAutoRead(
  chatId: string | null,
  uid: string | null,
  lastMessageId: string | undefined,
) {
  const lastMarked = useRef<string | null>(null);

  useEffect(() => {
    if (!chatId || !uid || !lastMessageId) return;
    if (lastMarked.current === `${chatId}:${lastMessageId}`) return;
    const key = `${chatId}:${lastMessageId}`;
    const mark = () => {
      if (document.visibilityState !== "visible") return;
      lastMarked.current = key;
      void markChatRead(chatId, uid).catch(() => undefined);
    };
    mark();
    const onVisible = () => mark();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [chatId, uid, lastMessageId]);
}

/* ── grouping ─────────────────────────────────────────────── */

export interface MessageGroup {
  dayKey: number;
  label: string;
  messages: OmiMessage[];
}

export function groupByDay(messages: OmiMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const last = groups[groups.length - 1];
    if (last && last.dayKey === dayKey) {
      last.messages.push(m);
    } else {
      groups.push({ dayKey, label: dayLabel(dayKey), messages: [m] });
    }
  }
  return groups;
}

function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(today) - ts) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

/* ── search filter ────────────────────────────────────────── */

export function filterChats(
  chats: OmiChat[],
  term: string,
  pinned: Record<string, true> = {},
) {
  const needle = term.trim().toLowerCase();
  const filtered = needle
    ? chats.filter(
        (c) =>
          c.title.toLowerCase().includes(needle) ||
          (c.lastMessage?.text ?? "").toLowerCase().includes(needle),
      )
    : chats;

  return [...filtered].sort((a, b) => {
    const ap = pinned[a.id] ? 1 : 0;
    const bp = pinned[b.id] ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return (
      (b.lastMessage?.createdAt ?? b.createdAt) -
      (a.lastMessage?.createdAt ?? a.createdAt)
    );
  });
}

/** A one-line preview of the latest message, adapted per kind. */
export function previewOf(chat: OmiChat, meId: string | null): string {
  const lm = chat.lastMessage;
  if (!lm) return "No messages yet — say hello 👋";
  const mine = lm.senderId === meId;
  const who = mine ? "You: " : chat.kind === "group" ? `${lm.senderName}: ` : "";
  switch (lm.kind) {
    case "image":
      return `${who}📷 Photo`;
    case "file":
      return `${who}📎 Attachment`;
    case "call":
      return `${who}📞 Call`;
    case "system":
      return lm.text;
    default:
      return `${who}${lm.text}`;
  }
}

export const TYPING_IDLE_MS = 2200;

export function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
