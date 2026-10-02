"use client";

import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCheck,
  Copy,
  Download,
  FileText,
  Pencil,
  Reply,
  Trash2,
  Phone,
  PhoneMissed,
  Clock,
  CircleAlert,
  Star,
  StarOff,
  Forward,
  Smile,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn, formatTime as fmtTime, formatFileSize } from "@/lib/utils";
import { isStarred, toggleStar } from "@/hooks/use-chat-data";
import type { OmiMessage } from "@/lib/types";

export interface MessageActions {
  onReply: (m: OmiMessage) => void;
  onEdit: (m: OmiMessage) => void;
  onDelete: (m: OmiMessage) => void;
  onReact: (m: OmiMessage, emoji: string) => void;
  onForward: (m: OmiMessage) => void;
}

/** Common quick-reaction emojis represented as icon+label pairs */
const QUICK_REACTIONS = [
  { emoji: "👍", label: "Like" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Haha" },
  { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🔥", label: "Fire" },
] as const;

/* ── Audio message player ─────────────────────────────────── */
function AudioPlayer({ url, durationHint }: { url: string; durationHint?: number | null }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(durationHint ?? 0);
  const [muted, setMuted] = useState(false);
  const audioRef = useState(() =>
    typeof Audio !== "undefined" ? new Audio(url) : null,
  )[0];

  useEffect(() => {
    const a = audioRef;
    if (!a) return;
    const onEnded = () => { setPlaying(false); setProgress(0); };
    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onMeta = () => setDuration(a.duration);
    a.addEventListener("ended", onEnded);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    return () => {
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.pause();
    };
  }, [audioRef]);

  const toggle = () => {
    if (!audioRef) return;
    if (playing) { audioRef.pause(); setPlaying(false); }
    else { void audioRef.play(); setPlaying(true); }
  };

  const toggleMute = () => {
    if (!audioRef) return;
    audioRef.muted = !muted;
    setMuted(!muted);
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <div className="flex min-w-[200px] items-center gap-2 py-1">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 transition-colors hover:bg-white/35"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>

      {/* waveform progress bar */}
      <div className="relative flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white/80 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <span className="shrink-0 text-[0.65rem] tabular-nums opacity-80">
        {duration ? formatSecs(duration) : "--:--"}
      </span>

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="grid size-7 shrink-0 place-items-center rounded-full opacity-60 transition-opacity hover:opacity-100"
      >
        {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
      </button>
    </div>
  );
}

/* ── Reaction bar ─────────────────────────────────────────── */
function ReactionBar({
  onReact,
  visible,
}: {
  onReact: (emoji: string) => void;
  visible: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong absolute -top-12 left-0 z-30 flex items-center gap-0.5 rounded-full px-2 py-1 shadow-xl"
        >
          {QUICK_REACTIONS.map(({ emoji, label }) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React with ${label}`}
              title={label}
              onClick={() => onReact(emoji)}
              className="grid size-8 place-items-center rounded-full text-lg transition-transform duration-150 hover:scale-125 hover:bg-fg/8"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Displayed reactions ──────────────────────────────────── */
function ReactionPills({
  reactions,
  myUid,
  onReact,
}: {
  reactions: Record<string, string[]>;
  myUid: string;
  onReact: (emoji: string) => void;
}) {
  const entries = Object.entries(reactions).filter(([, uids]) => uids.length > 0);
  if (!entries.length) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {entries.map(([emoji, uids]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
            uids.includes(myUid)
              ? "border-brand-400/60 bg-brand-50 text-brand-700"
              : "border-fg/10 bg-surface/80 text-fg-2 hover:bg-fg/5",
          )}
          title={`${uids.length} ${uids.length === 1 ? "reaction" : "reactions"}`}
        >
          <span>{emoji}</span>
          <span className="tabular-nums">{uids.length}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Main bubble ──────────────────────────────────────────── */

function MessageBubbleInner({
  message,
  mine,
  grouped,
  tail,
  showAvatar,
  peerId,
  peerName,
  peerAvatar,
  read,
  myUid,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onForward,
}: {
  message: OmiMessage;
  mine: boolean;
  /** consecutive message from the same sender — tighten the spacing */
  grouped: boolean;
  /** last message in a run — gets the pointed corner */
  tail: boolean;
  showAvatar: boolean;
  peerId: string;
  peerName: string;
  peerAvatar?: string | null;
  read: boolean;
  myUid: string;
  onReply: (m: OmiMessage) => void;
  onEdit: (m: OmiMessage) => void;
  onDelete: (m: OmiMessage) => void;
  onReact: (m: OmiMessage, emoji: string) => void;
  onForward: (m: OmiMessage) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  // Bug #5 Fix: draft is kept in sync with message.text using useEffect
  // so external edits (from another device) don't leave a stale value.
  const [draft, setDraft] = useState(message.text);
  const [starred, setStarred] = useState(() => isStarred(message.id));

  useEffect(() => {
    if (!editing) setDraft(message.text);
  }, [message.text, editing]);

  if (message.deleted) {
    return (
      <div className={cn("flex px-4", mine ? "justify-end" : "justify-start", grouped ? "mt-0.5" : "mt-3")}>
        <span className="rounded-2xl border border-fg/8 bg-fg/[0.03] px-3.5 py-2 text-xs text-fg-3 italic">
          This message was deleted
        </span>
      </div>
    );
  }

  const isCall = message.kind === "call";
  const isAudio =
    message.kind === "audio" ||
    (message.kind === "file" &&
      Boolean(
        message.attachmentName?.endsWith(".webm") ||
        message.attachmentName?.endsWith(".ogg") ||
        message.attachmentName?.endsWith(".mp3") ||
        message.attachmentName?.endsWith(".m4a") ||
        message.attachmentName?.endsWith(".wav") ||
        message.attachmentName?.startsWith("voice_")
      ));

  const submitEdit = () => {
    const next = draft.trim();
    if (!next || next === message.text) {
      setEditing(false);
      setDraft(message.text);
      return;
    }
    onEdit({ ...message, text: next });
    setEditing(false);
  };

  const handleStar = () => {
    const nowStarred = toggleStar({
      messageId: message.id,
      chatId: message.chatId,
      chatTitle: peerName,
      text: message.text || (message.kind === "audio" ? "Voice message" : "Attachment"),
      senderName: message.senderName,
      kind: message.kind,
      createdAt: message.createdAt,
    });
    setStarred(nowStarred);
    toast.success(nowStarred ? "Message starred" : "Star removed");
  };

  return (
    <div
      data-msg
      className={cn(
        "group/msg flex items-end gap-2 px-4",
        "msg-enter",
        mine ? "flex-row-reverse" : "flex-row",
        grouped ? "mt-0.5" : "mt-3",
      )}
      onMouseLeave={() => { setMenuOpen(false); setReactionOpen(false); }}
    >
      {/* avatar gutter — keeps alignment stable whether or not we render one */}
      <div className="w-8 shrink-0">
        {showAvatar && !mine && (
          <Avatar id={peerId} name={peerName} src={peerAvatar} size="xs" />
        )}
      </div>

      <div className={cn("flex max-w-[min(78%,34rem)] flex-col", mine ? "items-end" : "items-start")}>
        {/* forwarded label */}
        {message.forwarded && (
          <span className="mb-1 flex items-center gap-1 text-[0.65rem] text-fg-3">
            <Forward className="size-3" />
            Forwarded
          </span>
        )}

        {/* reply context */}
        {message.replyTo && (
          <div
            className={cn(
              "mb-1 flex max-w-full items-center gap-2 rounded-xl border-l-2 px-2.5 py-1.5 text-[0.7rem]",
              "border-brand-400/70 bg-brand-50 text-fg-2",
            )}
          >
            <Reply className="size-3 shrink-0 opacity-60" />
            <span className="font-medium">{message.replyTo.senderName}</span>
            <span className="min-w-0 truncate opacity-70">{message.replyTo.text}</span>
          </div>
        )}

        <div className={cn("relative flex items-center gap-1.5", mine && "flex-row-reverse")}>
          {/* reaction bar */}
          <div className="relative">
            <ReactionBar
              visible={reactionOpen}
              onReact={(emoji) => {
                onReact(message, emoji);
                setReactionOpen(false);
              }}
            />
          </div>

          {/* bubble */}
          <div
            className={cn(
              "relative overflow-hidden px-3.5 py-2.5 text-[0.88rem] leading-relaxed",
              mine
                ? "rounded-3xl bg-[linear-gradient(125deg,var(--color-brand-500),var(--color-brand-700)_88%)] text-on-accent shadow-[0_10px_30px_-14px_rgba(42,103,204,0.3)]"
                : "rounded-3xl border border-fg/10 bg-surface text-fg shadow-[0_1px_2px_rgba(19,23,37,0.05)]",
              tail && (mine ? "rounded-br-lg" : "rounded-bl-lg"),
              isCall && "bg-none border border-fg/10 bg-ink-800",
            )}
          >
            {isCall ? (
              <div className="flex items-center gap-3 py-0.5">
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    message.text.toLowerCase().includes("missed")
                      ? "bg-rust-100 text-rust-600"
                      : "bg-mint-100 text-mint-600",
                  )}
                >
                  {message.text.toLowerCase().includes("missed") ? (
                    <PhoneMissed className="size-4" />
                  ) : (
                    <Phone className="size-4" />
                  )}
                </span>
                <span>
                  <span className="block text-[0.8rem] font-medium text-fg">
                    {message.text}
                  </span>
                  <span className="text-[0.68rem] text-fg-3">
                    {fmtTime(message.createdAt)}
                  </span>
                </span>
              </div>
            ) : isAudio && message.attachmentUrl ? (
              <AudioPlayer
                url={message.attachmentUrl}
                durationHint={message.audioDuration}
              />
            ) : editing ? (
              <div className="flex w-64 items-center gap-2">
                <Input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitEdit();
                    if (e.key === "Escape") {
                      setEditing(false);
                      setDraft(message.text);
                    }
                  }}
                  className="h-9 border-fg/20 bg-fg/10 text-sm"
                />
                <Button size="icon-sm" onClick={submitEdit} aria-label="Save edit">
                  <Check className="size-3.5" />
                </Button>
              </div>
            ) : (
              <>
                {message.kind === "image" && message.attachmentUrl && (
                  <a
                    href={message.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 block overflow-hidden rounded-2xl"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={message.attachmentUrl}
                      alt={message.attachmentName ?? "Shared image"}
                      loading="lazy"
                      className="max-h-80 w-full max-w-sm object-cover transition-transform duration-500 hover:scale-[1.02]"
                    />
                  </a>
                )}

                {message.kind === "file" && message.attachmentUrl && (
                  <a
                    href={message.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={message.attachmentName ?? undefined}
                    className="mb-2 flex items-center gap-3 rounded-2xl border border-fg/10 bg-ink-800 px-3 py-2.5 transition-colors hover:bg-ink-750"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-fg/6">
                      <FileText className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.78rem] font-medium text-fg">
                        {message.attachmentName ?? "Attachment"}
                      </span>
                      {/* Bug #8 Fix: use formatFileSize instead of /1024 KB */}
                      <span className="text-[0.66rem] text-fg-2">
                        {message.attachmentSize
                          ? formatFileSize(message.attachmentSize)
                          : "File"}
                      </span>
                    </span>
                    <Download className="size-4 shrink-0 opacity-60" />
                  </a>
                )}

                {message.text && (
                  <FormattedMessageText text={message.text} mine={mine} />
                )}
              </>
            )}

            {/* meta row */}
            {!isCall && !editing && (
              <span
                className={cn(
                  "mt-1 flex items-center justify-end gap-1 text-[0.62rem]",
                  mine ? "text-white/75" : "text-fg-3",
                )}
              >
                {starred && <Star className="size-2.5 fill-current opacity-70" />}
                {message.editedAt && <span className="italic">edited</span>}
                {fmtTime(message.createdAt)}
                {mine && <StatusTick message={message} read={read} />}
              </span>
            )}
          </div>

          {/* hover actions */}
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/msg:opacity-100">
            <IconAction
              label="React"
              onClick={() => setReactionOpen((v) => !v)}
              icon={<Smile className="size-3.5" />}
            />
            <IconAction
              label="Reply"
              onClick={() => onReply(message)}
              icon={<Reply className="size-3.5" />}
            />
            {mine && !isCall && (
              <IconAction
                label="Edit"
                onClick={() => {
                  setDraft(message.text);
                  setEditing(true);
                  setMenuOpen(false);
                }}
                icon={<Pencil className="size-3.5" />}
              />
            )}
            <IconAction
              label="Copy text"
              onClick={async () => {
                const txt = message.text || (message.attachmentName ?? "");
                try {
                  await navigator.clipboard.writeText(txt);
                  toast.success("Copied to clipboard");
                } catch {
                  toast.error("Couldn't access the clipboard");
                }
              }}
              icon={<Copy className="size-3.5" />}
            />
            <IconAction
              label="Forward"
              onClick={() => onForward(message)}
              icon={<Forward className="size-3.5" />}
            />
            <IconAction
              label={starred ? "Unstar" : "Star"}
              onClick={handleStar}
              icon={starred ? <StarOff className="size-3.5" /> : <Star className="size-3.5" />}
              active={starred}
            />
            {mine && (
              <IconAction
                label="Delete"
                danger
                onClick={() => setMenuOpen(true)}
                icon={<Trash2 className="size-3.5" />}
              />
            )}
          </div>
        </div>

        {/* reactions display */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <ReactionPills
            reactions={message.reactions}
            myUid={myUid}
            onReact={(emoji) => onReact(message, emoji)}
          />
        )}

        {/* delete confirm */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center gap-2 rounded-2xl border border-rust-200 bg-rust-100 px-3 py-2"
          >
            <span className="text-xs text-rust-600">Delete this message?</span>
            <Button
              size="sm"
              variant="danger"
              className="h-7 px-3 text-xs"
              onClick={() => {
                onDelete(message);
                setMenuOpen(false);
              }}
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-3 text-xs"
              onClick={() => setMenuOpen(false)}
            >
              Cancel
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/**
 * Memoised because the conversation re-renders on every incoming message, on
 * every keystroke in the composer, and on every scroll tick that flips the
 * "at bottom" flag. Without this, one new message meant re-rendering and
 * re-running every earlier bubble's markup, which is O(n) per message.
 */
export const MessageBubble = memo(MessageBubbleInner);

function IconAction({
  label,
  icon,
  onClick,
  danger,
  active,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-7 place-items-center rounded-full text-fg-3 transition-colors",
        danger
          ? "hover:bg-rust-100 hover:text-rust-600"
          : active
            ? "bg-gold-100 text-gold-600"
            : "hover:bg-fg/7 hover:text-fg",
      )}
    >
      {icon}
    </button>
  );
}

function StatusTick({ message, read }: { message: OmiMessage; read: boolean }) {
  if (message.status === "sending") return <Clock className="size-3" />;
  if (message.status === "failed")
    return <CircleAlert className="size-3 text-rust-300" />;
  return read ? (
    <CheckCheck className="size-3.5 text-mint-200" />
  ) : (
    <CheckCheck className="size-3.5 opacity-55" />
  );
}

function FormattedMessageText({ text, mine }: { text: string; mine: boolean }) {
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  const parts = text.split(urlRegex);

  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          const href = part.startsWith("http://") || part.startsWith("https://")
            ? part
            : `https://${part}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "underline underline-offset-2 break-all transition-opacity hover:opacity-80 font-medium inline-flex items-center gap-0.5",
                mine
                  ? "text-white underline decoration-white/60 hover:decoration-white"
                  : "text-brand-600 underline decoration-brand-400 hover:decoration-brand-600 dark:text-brand-400",
              )}
            >
              <span>{part}</span>
              <ExternalLink className="inline size-3 shrink-0 opacity-75" />
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}