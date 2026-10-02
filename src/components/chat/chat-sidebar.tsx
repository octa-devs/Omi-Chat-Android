"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Plus,
  Settings,
  LogOut,
  Users,
  Phone,
  MessageSquarePlus,
  Pin,
  BellOff,
  CheckCheck,
  Info,
  SearchX,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SkeletonChatRow } from "@/components/ui/skeleton";
import { filterChats, previewOf, useNow } from "@/hooks/use-chat-data";
import { useAuth } from "@/components/providers/auth-provider";
import { cn, formatTime, isSameDay } from "@/lib/utils";
import type { OmiChat } from "@/lib/types";

export function ChatSidebar({
  chats,
  loading,
  activeChatId,
  onNewChat,
  onNewGroup,
}: {
  chats: OmiChat[];
  loading: boolean;
  activeChatId: string | null;
  onNewChat: () => void;
  onNewGroup: () => void;
}) {
  const { profile, signOut, uid } = useAuth();
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "groups">("all");
  const now = useNow(30_000);

  const pinned = profile?.pinnedChats ?? {};
  const muted = profile?.mutedChats ?? {};

  const visible = useMemo(() => {
    let list = filterChats(chats, term, pinned);
    if (filter === "unread") list = list.filter((c) => (c.unread ?? 0) > 0);
    if (filter === "groups") list = list.filter((c) => c.kind === "group");
    return list;
  }, [chats, term, filter, pinned]);

  const totalUnread = useMemo(
    () => chats.reduce((n, c) => n + (c.unread ?? 0), 0),
    [chats],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── identity bar ── */}
      <header className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <Link href="/chat" aria-label="Omi Chat home" className="shrink-0">
          <Logo variant="mark" size={30} />
        </Link>
        <Link
          href="/settings"
          className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-1.5 py-1 transition-colors hover:bg-fg/6"
        >
          <Avatar
            id={uid ?? "me"}
            name={profile?.displayName}
            src={profile?.avatarUrl}
            size="sm"
            presence={profile?.presence ?? "offline"}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-fg">
              {profile?.displayName ?? "You"}
            </span>
            <span className="block truncate text-[0.68rem] text-fg-3">
              @{profile?.username ?? "omi"}
            </span>
          </span>
          <Settings className="size-4 shrink-0 text-fg-3 transition-all duration-500 group-hover:rotate-90 group-hover:text-fg" />
        </Link>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onNewChat}
          aria-label="New conversation"
          title="New conversation"
        >
          <MessageSquarePlus className="size-4.5" />
        </Button>
      </header>

      {/* ── search ── */}
      <div className="px-4 pb-3">
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search conversations"
          icon={<Search className="size-4" />}
          className="h-11"
          aria-label="Search conversations"
        />
      </div>

      {/* ── filters ── */}
      <div className="flex gap-1.5 px-4 pb-3">
        {(
          [
            { key: "all", label: "All" },
            { key: "unread", label: `Unread${totalUnread ? ` · ${totalUnread}` : ""}` },
            { key: "groups", label: "Groups" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "relative rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-300",
              filter === f.key
                ? "text-brand-700"
                : "text-fg-3 hover:text-fg-2",
            )}
          >
            {filter === f.key && (
              <motion.span
                layoutId="sidebar-filter"
                className="absolute inset-0 -z-10 rounded-full bg-white shadow-[0_1px_3px_rgba(19,23,37,0.1)] ring-1 ring-fg/8"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            {f.label}
          </button>
        ))}
      </div>

      <div className="hairline mx-4" />

      {/* ── list ── */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="space-y-1 px-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonChatRow key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyList
            hasChats={chats.length > 0}
            onNewChat={onNewChat}
            term={term}
          />
        ) : (
          <ul className="space-y-0.5">
            <AnimatePresence initial={false}>
              {visible.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  meId={uid}
                  active={chat.id === activeChatId}
                  pinned={Boolean(pinned[chat.id])}
                  muted={Boolean(muted[chat.id])}
                  now={now}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* ── quick actions ── */}
      <div className="hairline mx-4" />
      <footer className="flex items-center gap-1.5 px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start px-2.5 text-fg-2"
          onClick={onNewGroup}
        >
          <Users className="size-4" />
          Group
        </Button>
        <Link
          href="/call"
          className="inline-flex h-9 flex-1 items-center gap-2 rounded-full px-2.5 text-sm text-fg-2 transition-colors hover:bg-fg/7 hover:text-fg"
        >
          <Phone className="size-4" />
          Calls
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Sign out"
          title="Sign out"
          className="text-fg-3 hover:text-rust-600"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" />
        </Button>
      </footer>
    </div>
  );
}

/* ── row ──────────────────────────────────────────────────── */

/** Compact relative stamp for the conversation list: 3m, 14:02, Tue, 12/03 */
function compactStamp(ts: number) {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return formatTime(ts);
  const weekAgo = now - 6 * 86_400_000;
  if (ts > weekAgo) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

function ChatRow({
  chat,
  meId,
  active,
  pinned,
  muted,
  now,
}: {
  chat: OmiChat;
  meId: string | null;
  active: boolean;
  pinned: boolean;
  muted: boolean;
  now: number;
}) {
  const lm = chat.lastMessage;
  const unread = chat.unread ?? 0;
  const mine = lm?.senderId === meId;

  const stamp = lm?.createdAt
    ? isSameDay(lm.createdAt, now)
      ? formatTime(lm.createdAt)
      : compactStamp(lm.createdAt)
    : "";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={`/chat/${chat.id}`}
        className={cn(
          "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-300",
          active ? "bg-white shadow-[0_1px_3px_rgba(19,23,37,0.08)]" : "hover:bg-fg/[0.04]",
        )}
      >
        {active && (
          <motion.span
            layoutId="chat-active"
            className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-[linear-gradient(180deg,var(--color-brand-400),var(--color-brand-600))]"
            transition={{ type: "spring", stiffness: 480, damping: 38 }}
          />
        )}

        <Avatar
          id={chat.id}
          name={chat.title}
          src={chat.avatarUrl}
          size="md"
          presence={chat.kind === "direct" ? undefined : "offline"}
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                unread || active
                  ? "font-semibold text-fg"
                  : "font-medium text-fg",
              )}
            >
              {chat.title}
            </p>
            {pinned && <Pin className="size-3 shrink-0 text-brand-600" />}
            {muted && <BellOff className="size-3 shrink-0 text-fg-3" />}
            <span className="shrink-0 text-[0.65rem] text-fg-3">{stamp}</span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5">
            {mine && !unread && (
              <CheckCheck className="size-3.5 shrink-0 text-brand-600" />
            )}
            <p
              className={cn(
                "min-w-0 flex-1 truncate text-xs",
                unread ? "text-fg" : "text-fg-3",
              )}
            >
              {previewOf(chat, meId)}
            </p>
            {unread > 0 && (
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[linear-gradient(120deg,var(--color-brand-500),var(--color-brand-700))] px-1.5 text-[0.65rem] font-semibold text-on-accent shadow-[0_4px_12px_-4px_rgba(42,103,204,0.7)]">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
        </div>

        <span className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <Info className="size-3.5 text-muted" />
        </span>
      </Link>
    </motion.li>
  );
}

/* ── empty states ─────────────────────────────────────────── */

function EmptyList({
  hasChats,
  onNewChat,
  term,
}: {
  hasChats: boolean;
  onNewChat: () => void;
  term: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
    >
      <span className="grid size-14 place-items-center rounded-3xl border border-fg/10 bg-ink-800 text-fg-3">
        {hasChats ? <SearchX className="size-6" /> : <MessageSquarePlus className="size-6" />}
      </span>
      <p className="text-sm font-medium text-fg">
        {hasChats ? `No results for “${term}”` : "No conversations yet"}
      </p>
      <p className="text-xs leading-relaxed text-fg-3">
        {hasChats
          ? "Try a different name or clear the search."
          : "Find someone by name or @username and start talking."}
      </p>
      {!hasChats && (
        <Button size="sm" onClick={onNewChat}>
          <Plus className="size-3.5" />
          Start a chat
        </Button>
      )}
    </motion.div>
  );
}