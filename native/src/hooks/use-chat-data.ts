"use client";

import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

  // Merge server messages with active optimistic messages
  const mergedMessages = [
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
  ];

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
      // AppState rather than document.visibilityState: on native the app is
      // backgrounded rather than hidden, and marking read while the user is
      // elsewhere would clear a badge they never actually looked at.
      if (AppState.currentState !== "active") return;
      lastMarked.current = key;
      void markChatRead(chatId, uid).catch(() => undefined);
    };
    mark();
    const sub = AppState.addEventListener("change", mark);
    return () => sub.remove();
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

/* ── native: no viewport queries ───────────────────────────── */

/**
 * The web build used useSyncExternalStore over a matchMedia query to switch
 * between a single-pane and a two-pane layout, and to dodge an SSR hydration
 * mismatch. A phone is always the single-pane layout and never hydrates, so
 * the whole hook is gone rather than stubbed to `true`.
 */

export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/* ── draft persistence ────────────────────────────────────── */

/** Feature: Draft Persistence — save and restore composer text per chat. */
const DRAFT_KEY = (chatId: string) => `omi:draft:${chatId}`;

/**
 * Async, unlike the web version.
 *
 * localStorage is synchronous; AsyncStorage is not. Anything that used to do
 * `useState(() => getDraft(id))` has to seed with "" and fill in from an
 * effect instead, which the native composer does.
 */
export async function getDraft(chatId: string): Promise<string> {
  return (await AsyncStorage.getItem(DRAFT_KEY(chatId))) ?? "";
}

export async function saveDraft(chatId: string, text: string) {
  if (text.trim()) {
    await AsyncStorage.setItem(DRAFT_KEY(chatId), text);
  } else {
    await AsyncStorage.removeItem(DRAFT_KEY(chatId));
  }
}

export async function clearDraft(chatId: string) {
  await AsyncStorage.removeItem(DRAFT_KEY(chatId));
}

/* ── starred messages ─────────────────────────────────────── */

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

export async function getStarred(): Promise<StarredEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STARRED_KEY);
    return raw ? (JSON.parse(raw) as StarredEntry[]) : [];
  } catch {
    return [];
  }
}

/** @returns whether the entry is starred after the toggle. */
export async function toggleStar(entry: StarredEntry): Promise<boolean> {
  const all = await getStarred();
  const idx = all.findIndex((s) => s.messageId === entry.messageId);
  if (idx >= 0) {
    all.splice(idx, 1);
    await AsyncStorage.setItem(STARRED_KEY, JSON.stringify(all));
    return false; // now unstarred
  }
  all.push(entry);
  await AsyncStorage.setItem(STARRED_KEY, JSON.stringify(all));
  return true; // now starred
}

export async function isStarred(messageId: string): Promise<boolean> {
  return (await getStarred()).some((s) => s.messageId === messageId);
}
