"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

export function useMessages(chatId: string | null, limit = 250) {
  const [messages, setMessages] = useState<OmiMessage[]>([]);
  const [optimistic, setOptimistic] = useState<OmiMessage[]>([]);
  const [loading, setLoading] = useState(Boolean(chatId));

  useEffect(() => {
    setOptimistic([]);
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unwatch = watchMessages(chatId, limit, (next) => {
      setMessages(next);
      setLoading(false);
      // Reconcile and remove optimistic messages that have appeared in the server response
      setOptimistic((prev) =>
        prev.filter(
          (opt) =>
            !next.some(
              (m) =>
                m.id === opt.id ||
                (m.senderId === opt.senderId &&
                  m.text === opt.text &&
                  m.kind === opt.kind &&
                  Math.abs(m.createdAt - opt.createdAt) < 20000),
            ),
        ),
      );
    });
    return unwatch;
  }, [chatId, limit]);

  const addOptimistic = (msg: OmiMessage) => {
    setOptimistic((prev) => [...prev, msg]);
  };

  const updateOptimistic = (tempId: string, patch: Partial<OmiMessage>) => {
    setOptimistic((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, ...patch } : m)),
    );
  };

  const removeOptimistic = (tempId: string) => {
    setOptimistic((prev) => prev.filter((m) => m.id !== tempId));
  };

  // Merge server messages with active optimistic messages with stable reference
  const mergedMessages = useMemo(() => [
    ...messages,
    ...optimistic.filter(
      (opt) =>
        !messages.some(
          (m) =>
            m.id === opt.id ||
            (m.senderId === opt.senderId &&
              m.text === opt.text &&
              m.kind === opt.kind &&
              Math.abs(m.createdAt - opt.createdAt) < 20000),
        ),
    ),
  ], [messages, optimistic]);

  return {
    messages: mergedMessages,
    loading,
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
  };
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
  if (!lm) return "No messages yet — say hello";
  const mine = lm.senderId === meId;
  const who = mine ? "You: " : chat.kind === "group" ? `${lm.senderName}: ` : "";
  switch (lm.kind) {
    case "image":
      return `${who}Photo`;
    case "file":
      return `${who}Attachment`;
    case "audio":
      return `${who}Voice message`;
    case "call":
      return `${who}Call`;
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

// Bug #1 Fix: SSR hydration mismatch — useState(false) always starts false,
// causing a layout flash on mobile. useSyncExternalStore correctly returns
// the server snapshot (false) for SSR and immediately reads the real value
// client-side without a second render cycle mismatch.
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const mq = window.matchMedia("(max-width: 1023px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/* ── draft persistence (in-memory cached + debounced) ───────── */

const DRAFT_KEY = (chatId: string) => `omi:draft:${chatId}`;
const draftCache = new Map<string, string>();
const draftFlushTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function getDraft(chatId: string): string {
  if (typeof window === "undefined") return "";
  if (draftCache.has(chatId)) {
    return draftCache.get(chatId) ?? "";
  }
  const stored = localStorage.getItem(DRAFT_KEY(chatId)) ?? "";
  draftCache.set(chatId, stored);
  return stored;
}

export function saveDraft(chatId: string, text: string) {
  if (typeof window === "undefined") return;
  draftCache.set(chatId, text);

  // Debounce disk/localStorage write
  const existingTimer = draftFlushTimers.get(chatId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    if (text.trim()) {
      localStorage.setItem(DRAFT_KEY(chatId), text);
    } else {
      localStorage.removeItem(DRAFT_KEY(chatId));
    }
    draftFlushTimers.delete(chatId);
  }, 350);

  draftFlushTimers.set(chatId, timer);
}

export function clearDraft(chatId: string) {
  if (typeof window === "undefined") return;
  draftCache.set(chatId, "");
  const existingTimer = draftFlushTimers.get(chatId);
  if (existingTimer) clearTimeout(existingTimer);
  localStorage.removeItem(DRAFT_KEY(chatId));
}

/* ── starred messages (in-memory cached O(1) lookups) ─────── */

const STARRED_KEY = "omi:starred";

export interface StarredEntry {
  messageId: string;
  chatId: string;
  chatTitle: string;
  text: string;
  senderName: string;
  kind: OmiMessage["kind"];
  createdAt: number;
}

let starredCache: StarredEntry[] | null = null;
let starredIdSet: Set<string> | null = null;

function ensureStarredLoaded(): { list: StarredEntry[]; set: Set<string> } {
  if (starredCache && starredIdSet) {
    return { list: starredCache, set: starredIdSet };
  }
  if (typeof window === "undefined") {
    return { list: [], set: new Set() };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(STARRED_KEY) ?? "[]") as StarredEntry[];
    starredCache = parsed;
    starredIdSet = new Set(parsed.map((s) => s.messageId));
  } catch {
    starredCache = [];
    starredIdSet = new Set();
  }
  return { list: starredCache, set: starredIdSet };
}

export function getStarred(): StarredEntry[] {
  return ensureStarredLoaded().list;
}

export function toggleStar(entry: StarredEntry): boolean {
  const { list, set } = ensureStarredLoaded();
  const idx = list.findIndex((s) => s.messageId === entry.messageId);

  if (idx >= 0) {
    list.splice(idx, 1);
    set.delete(entry.messageId);
    if (typeof window !== "undefined") {
      localStorage.setItem(STARRED_KEY, JSON.stringify(list));
    }
    return false; // now unstarred
  }

  list.push(entry);
  set.add(entry.messageId);
  if (typeof window !== "undefined") {
    localStorage.setItem(STARRED_KEY, JSON.stringify(list));
  }
  return true; // now starred
}

export function isStarred(messageId: string): boolean {
  return ensureStarredLoaded().set.has(messageId);
}

