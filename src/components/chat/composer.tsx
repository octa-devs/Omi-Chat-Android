"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Image as ImageIcon,
  Paperclip,
  Smile,
  X,
  CornerUpLeft,
  Loader2,
  Mic,
  MicOff,
  Square,
  ThumbsUp,
  Heart,
  Laugh,
  Meh,
  Frown,
  Flame,
  Star,
  Zap,
  Moon,
  Coffee,
  Rocket,
  MessageCircle,
  Phone as PhoneIcon,
  Headphones,
  Rainbow,
} from "lucide-react";
import { toast } from "sonner";
import { cn, errorMessage } from "@/lib/utils";
import { saveDraft } from "@/hooks/use-chat-data";
import type { OmiMessage } from "@/lib/types";

/** Bug #6 Fix: enforce a sane maximum message length */
const MAX_MSG_LENGTH = 4000;

/**
 * All emojis replaced with Lucide icon components.
 * Each entry maps a Lucide icon + the emoji character it inserts.
 */
const ICON_EMOJIS: Array<{ icon: React.ElementType; emoji: string; label: string }> = [
  { icon: Smile,        emoji: "😀", label: "Smile"      },
  { icon: Laugh,        emoji: "😂", label: "Laugh"      },
  { icon: Heart,        emoji: "❤️", label: "Heart"      },
  { icon: ThumbsUp,     emoji: "👍", label: "Like"       },
  { icon: Frown,        emoji: "😢", label: "Sad"        },
  { icon: Meh,          emoji: "🤔", label: "Thinking"   },
  { icon: Flame,        emoji: "🔥", label: "Fire"       },
  { icon: Star,         emoji: "⭐", label: "Star"       },
  { icon: Zap,          emoji: "⚡", label: "Zap"        },
  { icon: Moon,         emoji: "🌙", label: "Moon"       },
  { icon: Coffee,       emoji: "☕", label: "Coffee"     },
  { icon: Rocket,       emoji: "🚀", label: "Rocket"     },
  { icon: MessageCircle,emoji: "💬", label: "Chat"       },
  { icon: PhoneIcon,    emoji: "📞", label: "Call"       },
  { icon: Headphones,   emoji: "🎧", label: "Music"      },
  { icon: Rainbow,      emoji: "🌈", label: "Rainbow"    },
];

export function Composer({
  chatId,
  onSend,
  onAttach,
  onVoice,
  onTyping,
  replyTo,
  onCancelReply,
  enterToSend,
  disabled,
  placeholder = "Type a message…",
}: {
  chatId?: string;
  onSend: (text: string) => Promise<void>;
  /** Parent owns the upload + send so this component stays transport-agnostic. */
  onAttach: (
    file: File,
    onProgress: (pct: number) => void,
  ) => Promise<void>;
  /** Voice message handler */
  onVoice?: (blob: Blob, durationSec: number) => Promise<void>;
  onTyping: (typing: boolean) => void;
  replyTo: OmiMessage | null;
  onCancelReply: () => void;
  enterToSend: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => {
    if (!chatId) return "";
    return typeof window !== "undefined"
      ? (localStorage.getItem(`omi:draft:${chatId}`) ?? "")
      : "";
  });
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartRef = useRef<number>(0);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  /* auto-grow */
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [text]);

  /* focus when a reply is armed */
  useEffect(() => {
    if (replyTo) taRef.current?.focus();
  }, [replyTo]);

  /* stop the "typing" flag when we unmount */
  useEffect(
    () => () => {
      if (typingRef.current) clearTimeout(typingRef.current);
      if (isTypingRef.current) onTyping(false);
    },
    [onTyping],
  );

  /* Draft persistence: save on every text change */
  useEffect(() => {
    if (!chatId) return;
    saveDraft(chatId, text);
  }, [chatId, text]);

  const signalTyping = (value: string) => {
    if (typingRef.current) clearTimeout(typingRef.current);
    if (!isTypingRef.current && value.trim()) {
      isTypingRef.current = true;
      onTyping(true);
    }
    typingRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTyping(false);
      }
    }, 2000);
  };

  const send = async () => {
    const value = text.trim();
    if (!value || sending || disabled) return;
    setSending(true);
    setText("");
    if (chatId) saveDraft(chatId, ""); // clear draft on send
    if (typingRef.current) clearTimeout(typingRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping(false);
    }
    try {
      await onSend(value);
      onCancelReply();
      taRef.current?.focus();
    } catch (e) {
      setText(value); // give the message back so nothing is lost
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const attach = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      toast.error("Files must be 12 MB or smaller.");
      return;
    }
    setUploadPct(0);
    try {
      await onAttach(file, setUploadPct);
      toast.success(file.type.startsWith("image/") ? "Photo sent" : "File sent");
    } catch (e) {
      toast.error(errorMessage(e) || "Upload failed.");
    } finally {
      setUploadPct(null);
      if (fileRef.current) fileRef.current.value = "";
      if (imgRef.current) imgRef.current.value = "";
    }
  };

  /* ── Paste image attachments from clipboard ──────────────── */
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          void attach(file);
          return;
        }
      }
    }
  };

  /* ── Voice recording ──────────────────────────────────────── */
  const startRecording = async () => {
    if (!onVoice) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recordChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordChunksRef.current, { type: "audio/webm" });
        const durationSec = (Date.now() - recordStartRef.current) / 1000;
        if (blob.size > 0 && onVoice) {
          try {
            await onVoice(blob, durationSec);
          } catch (e) {
            toast.error(errorMessage(e) || "Failed to send voice message.");
          }
        }
        setRecording(false);
        setRecordSecs(0);
      };
      mr.start(250);
      mediaRecorderRef.current = mr;
      recordStartRef.current = Date.now();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs(Math.floor((Date.now() - recordStartRef.current) / 1000));
      }, 500);
    } catch {
      toast.error("Microphone access was blocked or unavailable.");
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const cancelRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    if (mediaRecorderRef.current?.state !== "inactive") {
      recordChunksRef.current = []; // discard
      mediaRecorderRef.current?.stop();
    }
    setRecording(false);
    setRecordSecs(0);
  };

  const uploading = uploadPct !== null;

  const formatRecordSecs = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // Bug #6 Fix: remaining character count helper
  const remaining = MAX_MSG_LENGTH - text.length;
  const nearLimit = remaining < 200;

  return (
    <div className="px-3 pt-2 pb-3 sm:px-4 sm:pb-4">
      {/* reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5">
              <CornerUpLeft className="size-4 shrink-0 text-brand-600" />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.68rem] font-semibold tracking-wide text-brand-600 uppercase">
                  Replying to {replyTo.senderName}
                </span>
                <span className="block truncate text-xs text-fg-2">
                  {replyTo.text || "Attachment"}
                </span>
              </span>
              <button
                onClick={onCancelReply}
                aria-label="Cancel reply"
                className="shrink-0 rounded-full p-1 text-fg-3 transition-colors hover:bg-fg/8 hover:text-fg"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* icon-based emoji tray — emojis replaced with Lucide icons */}
      <AnimatePresence>
        {emojiOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong mb-2 grid grid-cols-8 gap-1 rounded-3xl p-2.5 sm:grid-cols-16"
          >
            {ICON_EMOJIS.map(({ icon: Icon, emoji, label }) => (
              <button
                key={label}
                onClick={() => {
                  setText((t) => t + emoji);
                  taRef.current?.focus();
                }}
                aria-label={label}
                title={label}
                className="grid size-9 place-items-center rounded-xl text-fg-3 transition-all duration-200 hover:scale-125 hover:bg-brand-50 hover:text-brand-600"
              >
                <Icon className="size-4" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* upload progress */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-2 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5"
          >
            <Loader2 className="size-4 shrink-0 animate-spin text-brand-600" />
            <span className="flex-1 text-xs text-fg-2">Uploading…</span>
            <span className="h-1 w-24 overflow-hidden rounded-full bg-ink-800">
              <motion.span
                animate={{ width: `${uploadPct ?? 0}%` }}
                transition={{ duration: 0.25 }}
                className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-brand-400),var(--color-gold-400))]"
              />
            </span>
            <span className="w-9 text-right text-xs tabular-nums text-fg-3">
              {Math.round(uploadPct ?? 0)}%
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* voice recording indicator */}
      <AnimatePresence>
        {recording && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mb-2 flex items-center gap-3 rounded-2xl border border-rust-200 bg-rust-50 px-4 py-2.5"
          >
            <span className="size-2 animate-pulse rounded-full bg-rust-500" />
            <span className="flex-1 text-xs font-medium text-rust-700">
              Recording — {formatRecordSecs(recordSecs)}
            </span>
            <button
              type="button"
              onClick={cancelRecording}
              aria-label="Cancel recording"
              className="rounded-full p-1 text-rust-600 transition-colors hover:bg-rust-100"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bug #6 Fix: character limit warning */}
      <AnimatePresence>
        {nearLimit && text.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "mb-1 text-right text-[0.62rem] tabular-nums",
              remaining <= 0 ? "text-rust-600" : "text-fg-3",
            )}
          >
            {remaining} / {MAX_MSG_LENGTH}
          </motion.p>
        )}
      </AnimatePresence>

      {/* composer bar */}
      <div
        className={cn(
          "glass flex items-end gap-1.5 rounded-3xl p-1.5 transition-all duration-300 focus-within:border-brand-400/70 focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-brand-500)_13%,transparent)]",
          disabled && "opacity-60",
        )}
      >
        <IconButton
          label="Add emoji"
          active={emojiOpen}
          onClick={() => setEmojiOpen((v) => !v)}
        >
          <Smile className="size-4.5" />
        </IconButton>

        <IconButton
          label="Attach file"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading || recording}
        >
          <Paperclip className="size-4.5" />
        </IconButton>

        <IconButton
          label="Send a photo"
          onClick={() => imgRef.current?.click()}
          disabled={disabled || uploading || recording}
        >
          <ImageIcon className="size-4.5" />
        </IconButton>

        <textarea
          ref={taRef}
          value={text}
          rows={1}
          disabled={disabled || recording}
          maxLength={MAX_MSG_LENGTH}
          onChange={(e) => {
            setText(e.target.value);
            signalTyping(e.target.value);
          }}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={recording ? "Release to send…" : placeholder}
          aria-label="Message"
          className="max-h-45 min-h-9 flex-1 resize-none bg-transparent px-1.5 py-2 text-[0.9rem] leading-relaxed text-fg outline-none placeholder:text-fg-3"
        />

        {/* Send or Voice button */}
        {text.trim() ? (
          <motion.button
            type="button"
            onClick={() => void send()}
            disabled={!text.trim() || sending || disabled || text.length > MAX_MSG_LENGTH}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.06 }}
            aria-label="Send message"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full transition-all duration-300",
              text.trim() && !disabled && text.length <= MAX_MSG_LENGTH
                ? "bg-[linear-gradient(125deg,var(--color-brand-500),var(--color-brand-700))] text-on-accent shadow-[0_8px_26px_-8px_rgba(42,103,204,0.32)]"
                : "bg-ink-800 text-fg-3",
            )}
          >
            {sending ? (
              <Loader2 className="size-4.5 animate-spin" />
            ) : (
              <ArrowUp className="size-4.5" />
            )}
          </motion.button>
        ) : onVoice ? (
          <motion.button
            type="button"
            onPointerDown={() => void startRecording()}
            onPointerUp={stopRecording}
            onPointerLeave={stopRecording}
            disabled={disabled || uploading}
            whileTap={{ scale: 0.9 }}
            aria-label={recording ? "Stop recording" : "Hold to record voice message"}
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full transition-all duration-300",
              recording
                ? "animate-pulse bg-rust-500 text-white shadow-[0_8px_26px_-8px_rgba(194,30,60,0.5)]"
                : "bg-ink-800 text-fg-3 hover:bg-brand-100 hover:text-brand-600",
            )}
          >
            {recording ? <Square className="size-4.5 fill-current" /> : <Mic className="size-4.5" />}
          </motion.button>
        ) : (
          <div className="size-10 shrink-0" /> /* spacer when no voice support */
        )}
      </div>

      <p className="mt-2 px-2 text-center text-[0.62rem] text-fg-3">
        Press Enter to send · Shift + Enter for new line
      </p>

      <input
        ref={fileRef}
        type="file"
        hidden
        onChange={(e) => void attach(e.target.files?.[0])}
      />
      <input
        ref={imgRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void attach(e.target.files?.[0])}
      />
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  active,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-300 disabled:opacity-35",
        active
          ? "bg-brand-100 text-brand-700"
          : "text-fg-3 hover:bg-fg/7 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}