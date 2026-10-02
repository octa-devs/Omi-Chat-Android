"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Phone,
  Video,
  Info,
  Search,
  X,
  MessageSquareDashed,
  ChevronDown,
  Pin,
  BellOff,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SkeletonBubble, PageSkeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";
import { Composer } from "./composer";
import { ChatInfoPanel } from "./chat-info-panel";
import { useAuth } from "@/components/providers/auth-provider";
import { useCalls } from "@/components/providers/call-provider";
import { useSettings } from "@/components/providers/settings-provider";
import {
  groupByDay,
  useAutoRead,
  useChat,
  useMessages,
  useTyping,
  useIsMobile,
} from "@/hooks/use-chat-data";
import {
  deleteMessage,
  editMessage,
  markMessageRead,
  sendMessage,
  setTyping,
  uploadAttachment,
} from "@/lib/supabase/chats";
import { getUsers } from "@/lib/supabase/users";
import { setMuted, setPinned } from "@/lib/supabase/users";
import { cn, formatLastSeen, errorMessage } from "@/lib/utils";
import { playMessageChime } from "@/lib/ringtone";
import type { OmiMessage, OmiUser } from "@/lib/types";

/**
 * Has anyone other than me read this message?
 *
 * The Firebase version kept a `readBy` map on every message, written by every
 * recipient. Postgres keeps one read cursor per member instead, so this is a
 * comparison against each peer's cursor rather than a lookup in a per-message
 * object — same answer, one fewer write per read.
 */
export function Conversation({
  chatId,
  onBack,
}: {
  chatId: string;
  onBack: () => void;
}) {
  const { uid, profile } = useAuth();
  const { settings } = useSettings();
  const { startCall } = useCalls();
  const isMobile = useIsMobile();

  const { chat, loading: chatLoading } = useChat(chatId);
  const { messages, loading: messagesLoading } = useMessages(chatId);
  const typingNames = useTyping(chatId);

  const [peer, setPeer] = useState<OmiUser | null>(null);
  const [members, setMembers] = useState<OmiUser[]>([]);
  const [replyTo, setReplyTo] = useState<OmiMessage | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [atBottom, setAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  const lastMessage = messages[messages.length - 1];
  useAutoRead(chatId, uid, lastMessage?.id);

  /* ── resolve participants ── */
  useEffect(() => {
    if (!chat || !uid) return;
    const others = Object.keys(chat.members).filter((m) => m !== uid);
    let alive = true;
    void getUsers(others).then((map) => {
      if (!alive) return;
      const list = others.map((id) => map[id]).filter(Boolean);
      setMembers(list);
      if (chat.kind === "direct") setPeer(list[0] ?? null);
    });
    return () => {
      alive = false;
    };
  }, [chat, uid]);

  const peerId = useMemo(
    () => Object.keys(chat?.members ?? {}).find((m) => m !== uid) ?? "unknown",
    [chat, uid],
  );

  /* ── chime on incoming ── */
  useEffect(() => {
    if (messagesLoading || !lastMessage || !uid) return;
    if (lastMessage.senderId === uid) return;
    if (messages.length === lastCountRef.current) return;
    if (lastCountRef.current !== 0 && settings.messageSounds) {
      playMessageChime(true);
    }
    lastCountRef.current = messages.length;
  }, [messages, messagesLoading, lastMessage, uid, settings.messageSounds]);

  /* ── autoscroll ── */
  useEffect(() => {
    if (messagesLoading) return;
    if (atBottom || lastMessage?.senderId === uid) {
      bottomRef.current?.scrollIntoView({ behavior: lastCountRef.current ? "smooth" : "auto" });
    }
  }, [messages, messagesLoading, atBottom, lastMessage]);

  /**
   * Scroll fires far faster than React can usefully re-render, and the two
   * reads below (scrollHeight, clientHeight) force a synchronous layout
   * every time. Doing that on every event is what made long conversations
   * stutter while scrolling.
   *
   * So: only touch state when the answer actually changes, and only mark the
   * newest message read once per message rather than once per scroll event.
   */
  const readMarkedRef = useRef<string | null>(null);
  const atBottomRef = useRef(true);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (near !== atBottomRef.current) {
      atBottomRef.current = near;
      setAtBottom(near);
    }
    if (!near) return;

    const lm = messages[messages.length - 1];
    if (!uid || !lm || lm.senderId === uid) return;
    if (readMarkedRef.current === lm.id) return;
    readMarkedRef.current = lm.id;
    void markMessageRead(chatId, lm.id, uid).catch(() => undefined);
  }, [messages, uid, chatId]);

  /* ── actions ── */
  const handleSend = useCallback(
    async (text: string) => {
      if (!chat || !uid || !profile) return;
      await sendMessage({
        chat,
        senderId: uid,
        senderName: profile.displayName,
        text,
        replyTo: replyTo
          ? {
              id: replyTo.id,
              text: replyTo.text || "Attachment",
              senderName: replyTo.senderName,
            }
          : null,
      });
      setAtBottom(true);
    },
    [chat, uid, profile, replyTo],
  );

  const handleAttach = useCallback(
    async (file: File, onProgress: (p: number) => void) => {
      if (!chat || !uid || !profile) return;
      const res = await uploadAttachment(uid, chat.id, file, onProgress);
      await sendMessage({
        chat,
        senderId: uid,
        senderName: profile.displayName,
        text: "",
        kind: file.type.startsWith("image/") ? "image" : "file",
        attachmentUrl: res.url,
        attachmentName: res.name,
        attachmentSize: res.size,
      });
      setAtBottom(true);
    },
    [chat, uid, profile],
  );

  const handleTyping = useCallback(
    (typing: boolean) => {
      if (!chat || !uid || !settings.typingIndicator) return;
      void setTyping(chat.id, uid, typing ? profile?.displayName ?? "Someone" : null).catch(
        () => undefined,
      );
    },
    [chat, uid, profile, settings.typingIndicator],
  );

  const handleEdit = useCallback(
    async (m: OmiMessage) => {
      await editMessage(chatId, m.id, m.text);
    },
    [chatId],
  );

  const handleDelete = useCallback(
    async (m: OmiMessage) => {
      await deleteMessage(chatId, m.id);
      toast.success("Message deleted");
    },
    [chatId],
  );

  const call = async (kind: "audio" | "video") => {
    if (chat?.kind === "group") {
      toast.error("Group calls are coming soon. Start a 1:1 call from a direct chat.");
      return;
    }
    if (!peer) {
      toast.error("Still loading this contact — try again in a moment.");
      return;
    }
    try {
      await startCall({
        peerId: peer.uid,
        peerName: peer.displayName,
        kind,
        chatId,
      });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  /* ── filtering ── */
  const shown = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return messages;
    return messages.filter((m) => m.text.toLowerCase().includes(needle));
  }, [messages, term]);

  const groups = useMemo(() => groupByDay(shown), [shown]);
  const typingVisible = typingNames.filter((n) => n !== profile?.displayName);

  /* ── lookups hoisted out of the render loop ── */
  // Both of these used to run once per message per render: a `.find` across
  // members, and Object.entries() over the read cursors. In a long
  // conversation that is thousands of comparisons and allocations every time
  // anything at all re-renders.
  const memberByUid = useMemo(() => {
    const map = new Map<string, OmiUser>();
    for (const m of members) map.set(m.uid, m);
    return map;
  }, [members]);

  const peerCursors = useMemo(() => {
    const cursors = chat?.readCursors;
    if (!cursors || !uid) return null;
    const at: number[] = [];
    for (const [who, when] of Object.entries(cursors)) {
      if (who !== uid) at.push(when);
    }
    return at.length ? at : null;
  }, [chat?.readCursors, uid]);

  const senderOf = useCallback(
    (senderId: string) => memberByUid.get(senderId),
    [memberByUid],
  );

  const readByPeer = useCallback(
    (m: OmiMessage) => {
      if (!peerCursors) return false;
      for (const at of peerCursors) {
        if (m.createdAt <= at) return true;
      }
      return false;
    },
    [peerCursors],
  );

  /* ── states ── */
  if (chatLoading && !chat) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-fg/8 px-4 py-3.5">
          <div className="skeleton size-11 rounded-full" />
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-32" />
            <div className="skeleton h-2.5 w-20" />
          </div>
        </div>
        <div className="flex-1 space-y-4 p-5">
          {[false, true, false, true, true, false, true].map((own, i) => (
            <SkeletonBubble key={i} own={own} />
          ))}
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <PageSkeleton label="Conversation unavailable" />
      </div>
    );
  }

  const presence = chat.kind === "direct" ? (peer?.presence ?? "offline") : undefined;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      {/* ── header ── */}
      <header className="z-20 flex shrink-0 items-center gap-3 border-b border-fg/8 bg-ink-900/75 px-3 py-3 backdrop-blur-2xl sm:px-4">
        <button
          onClick={onBack}
          aria-label="Back to conversations"
          className="-ml-1 grid size-9 shrink-0 place-items-center rounded-full text-fg-3 transition-colors hover:bg-fg/7 hover:text-fg lg:hidden"
        >
          <ArrowLeft className="size-5" />
        </button>

        <button
          onClick={() => setInfoOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-0.5 text-left transition-colors hover:bg-fg/[0.04]"
        >
          {chat.kind === "group" && members.length > 1 ? (
            <AvatarStack people={members.map((m) => ({ uid: m.uid, displayName: m.displayName, avatarUrl: m.avatarUrl }))} size="sm" />
          ) : (
            <Avatar
              id={peerId}
              name={chat.title}
              src={chat.avatarUrl}
              size="md"
              presence={presence}
            />
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[0.95rem] font-semibold text-fg">
                {chat.kind === "group" ? chat.title : (peer?.displayName ?? chat.title)}
              </span>
              {Boolean(profile?.pinnedChats?.[chat.id]) && (
                <Pin className="size-3 shrink-0 text-brand-600" />
              )}
              {Boolean(profile?.mutedChats?.[chat.id]) && (
                <BellOff className="size-3 shrink-0 text-fg-3" />
              )}
            </span>
            <span className="block truncate text-xs">
              <AnimatePresence mode="wait" initial={false}>
                {typingVisible.length > 0 ? (
                  <motion.span
                    key="typing"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="flex items-center gap-1.5 text-brand-600"
                  >
                    <TypingDots />
                    {typingVisible.length === 1
                      ? `${typingVisible[0]} is typing…`
                      : `${typingVisible.length} people are typing…`}
                  </motion.span>
                ) : (
                  <motion.span
                    key="presence"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className={cn(
                      chat.kind === "group"
                        ? "text-fg-3"
                        : presence === "online"
                          ? "text-mint-600"
                          : "text-fg-3",
                    )}
                  >
                    {chat.kind === "group"
                      ? `${members.length + 1} members`
                      : presence === "online"
                        ? "online now"
                        : formatLastSeen(peer?.lastSeen)}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Search in conversation"
            title="Search in conversation"
            onClick={() => setSearchOpen((v) => !v)}
            className={cn(searchOpen && "bg-brand-100 text-brand-700")}
          >
            <Search className="size-4.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Start audio call"
            title="Audio call"
            onClick={() => void call("audio")}
          >
            <Phone className="size-4.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Start video call"
            title="Video call"
            onClick={() => void call("video")}
          >
            <Video className="size-4.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Conversation details"
            title="Details"
            onClick={() => setInfoOpen(true)}
            className="hidden sm:inline-flex"
          >
            <Info className="size-4.5" />
          </Button>
        </div>
      </header>

      {/* ── search bar ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 overflow-hidden border-b border-fg/8 bg-ink-900/70"
          >
            <div className="flex items-center gap-2 px-4 py-3">
              <Input
                autoFocus
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search this conversation"
                icon={<Search className="size-4" />}
                className="h-10"
              />
              {term && (
                <span className="shrink-0 text-xs text-fg-3">
                  {shown.length} match{shown.length === 1 ? "" : "es"}
                </span>
              )}
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Close search"
                onClick={() => {
                  setSearchOpen(false);
                  setTerm("");
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── messages ── */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4"
      >
        {messagesLoading ? (
          <div className="space-y-4 px-1">
            <SkeletonBubble own={false} />
            <SkeletonBubble own />
            <SkeletonBubble own={false} />
          </div>
        ) : shown.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="grid size-16 place-items-center rounded-4xl border border-fg/10 bg-ink-800 text-fg-3">
              <MessageSquareDashed className="size-7" />
            </span>
            <div>
              <p className="font-display text-2xl text-fg">
                {term ? "No matches" : `This is the start of something`}
              </p>
              <p className="mt-2 text-sm text-fg-3">
                {term
                  ? `Nothing here matches “${term}”.`
                  : `Say hello to ${chat.kind === "group" ? chat.title : (peer?.displayName ?? chat.title)}.`}
              </p>
            </div>
          </div>
        ) : (
          <>
            {groups.map((g) => (
              <section key={g.dayKey}>
                <div className="sticky top-0 z-10 flex justify-center py-2">
                  <span className="glass rounded-full px-3.5 py-1 text-[0.65rem] font-medium tracking-wide text-fg-3">
                    {g.label}
                  </span>
                </div>
                {g.messages.map((m, i) => {
                  const prev = g.messages[i - 1];
                  const next = g.messages[i + 1];
                  const mine = m.senderId === uid;
                  const grouped = Boolean(prev && prev.senderId === m.senderId);
                  const tail = !next || next.senderId !== m.senderId;
                  const sender = senderOf(m.senderId);
                  return (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      mine={mine}
                      grouped={grouped}
                      tail={tail}
                      showAvatar={!mine && !grouped}
                      peerId={m.senderId}
                      peerName={sender?.displayName ?? m.senderName}
                      peerAvatar={sender?.avatarUrl}
                      read={readByPeer(m)}
                      onReply={setReplyTo}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </section>
            ))}
            <div ref={bottomRef} className="h-2" />
          </>
        )}
      </div>

      {/* ── jump to latest ── */}
      <AnimatePresence>
        {!atBottom && shown.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={() => {
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
              setAtBottom(true);
            }}
            aria-label="Jump to latest message"
            className="glass-strong absolute bottom-32 left-1/2 z-20 grid size-10 -translate-x-1/2 place-items-center rounded-full text-fg-2 shadow-xl transition-colors hover:text-fg"
          >
            <ChevronDown className="size-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── composer ── */}
      <div className="shrink-0">
        <Composer
          onSend={handleSend}
          onAttach={handleAttach}
          onTyping={handleTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          enterToSend={settings.enterToSend}
        />
      </div>

      {/* ── info drawer ── */}
      <ChatInfoPanel
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        chat={chat}
        members={members}
        meId={uid}
        onStartCall={(kind) => {
          setInfoOpen(false);
          void call(kind);
        }}
        onTogglePin={async () => {
          if (!uid) return;
          const next = !profile?.pinnedChats?.[chat.id];
          await setPinned(uid, chat.id, next);
          toast.success(next ? "Pinned to the top" : "Unpinned");
        }}
        onToggleMute={async () => {
          if (!uid) return;
          const next = !profile?.mutedChats?.[chat.id];
          await setMuted(uid, chat.id, next);
          toast.success(next ? "Notifications muted" : "Notifications on");
        }}
        pinned={Boolean(profile?.pinnedChats?.[chat.id])}
        muted={Boolean(profile?.mutedChats?.[chat.id])}
      />
    </div>
  );
}

function TypingDots() {
  return (
    <span className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1 rounded-full bg-current"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.14 }}
        />
      ))}
    </span>
  );
}