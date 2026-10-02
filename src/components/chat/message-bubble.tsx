"use client";

import { memo, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn, formatTime as fmtTime } from "@/lib/utils";
import type { OmiMessage } from "@/lib/types";

export interface MessageActions {
  onReply: (m: OmiMessage) => void;
  onEdit: (m: OmiMessage) => void;
  onDelete: (m: OmiMessage) => void;
}

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
  onReply,
  onEdit,
  onDelete,
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
  onReply: (m: OmiMessage) => void;
  onEdit: (m: OmiMessage) => void;
  onDelete: (m: OmiMessage) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

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

  return (
    <div
      // Was motion.div with layout="position". Framer-motion's layout
      // animation measures this element's box before and after every render,
      // so a conversation of a few hundred messages meant a few hundred
      // forced layout reads on every keystroke and every incoming message.
      // That was the single largest source of scroll jank on a phone. The
      // entrance is a plain CSS keyframe instead, which the compositor handles
      // without touching layout at all.
      //
      // content-visibility lets the browser skip laying out and painting
      // bubbles that are scrolled out of view, while contain-intrinsic-size
      // keeps the scrollbar the right length. It is what replaces the windowing
      // a longer list would otherwise need, and it needs no measurement code.
      data-msg
      className={cn(
        "group/msg flex items-end gap-2 px-4",
        "msg-enter",
        mine ? "flex-row-reverse" : "flex-row",
        grouped ? "mt-0.5" : "mt-3",
      )}
      onMouseLeave={() => setMenuOpen(false)}
    >
      {/* avatar gutter — keeps alignment stable whether or not we render one */}
      <div className="w-8 shrink-0">
        {showAvatar && !mine && (
          <Avatar id={peerId} name={peerName} src={peerAvatar} size="xs" />
        )}
      </div>

      <div className={cn("flex max-w-[min(78%,34rem)] flex-col", mine ? "items-end" : "items-start")}>
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
          {/* bubble */}
          <div
            className={cn(
              "relative overflow-hidden px-3.5 py-2.5 text-[0.88rem] leading-relaxed",
              mine
                ? "rounded-3xl bg-[linear-gradient(125deg,var(--color-brand-500),var(--color-brand-700)_88%)] text-on-accent shadow-[0_10px_30px_-14px_rgba(42,103,204,0.3)]"
                : "rounded-3xl border border-fg/10 bg-white text-fg shadow-[0_1px_2px_rgba(19,23,37,0.05)]",
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
                      <span className="text-[0.66rem] text-fg-2">
                        {message.attachmentSize
                          ? `${(message.attachmentSize / 1024).toFixed(0)} KB`
                          : "File"}
                      </span>
                    </span>
                    <Download className="size-4 shrink-0 opacity-60" />
                  </a>
                )}

                {message.text && (
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
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
                {message.editedAt && <span className="italic">edited</span>}
                {fmtTime(message.createdAt)}
                {mine && <StatusTick message={message} read={read} />}
              </span>
            )}
          </div>

          {/* hover actions */}
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/msg:opacity-100">
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
              label="Copy"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(message.text);
                  toast.success("Copied to clipboard");
                } catch {
                  toast.error("Couldn't access the clipboard");
                }
              }}
              icon={<Copy className="size-3.5" />}
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
 *
 * This only pays off because the props are genuinely stable: `message` is the
 * same object from state, and `onReply`/`onEdit`/`onDelete` are useCallback'd
 * in the parent. If a callback there ever loses its dependency array the memo
 * silently stops helping, so keep them stable.
 */
export const MessageBubble = memo(MessageBubbleInner);

function IconAction({
  label,
  icon,
  onClick,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
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