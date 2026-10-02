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
} from "lucide-react";
import { toast } from "sonner";
import { cn, errorMessage } from "@/lib/utils";
import type { OmiMessage } from "@/lib/types";

const EMOJI = [
  "😀","😂","🥹","😍","🤩","😎","🤔","🙌","👋","👍","👏","🙏","🔥","✨","💜","🎉",
  "😅","😭","😴","🤯","🥳","😇","🤝","💯","⚡","🌙","☕","🚀","💬","📞","🎧","🌈",
];

export function Composer({
  onSend,
  onAttach,
  onTyping,
  replyTo,
  onCancelReply,
  enterToSend,
  disabled,
  placeholder = "Type a message…",
}: {
  onSend: (text: string) => Promise<void>;
  /** Parent owns the upload + send so this component stays transport-agnostic. */
  onAttach: (
    file: File,
    onProgress: (pct: number) => void,
  ) => Promise<void>;
  onTyping: (typing: boolean) => void;
  replyTo: OmiMessage | null;
  onCancelReply: () => void;
  enterToSend: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
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

  const uploading = uploadPct !== null;

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

      {/* emoji tray */}
      <AnimatePresence>
        {emojiOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong mb-2 grid grid-cols-8 gap-1 rounded-3xl p-2.5 sm:grid-cols-16"
          >
            {EMOJI.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setText((t) => t + e);
                  taRef.current?.focus();
                }}
                className="grid size-8 place-items-center rounded-xl text-lg transition-transform duration-200 hover:scale-125 hover:bg-fg/8"
              >
                {e}
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
          disabled={disabled || uploading}
        >
          <Paperclip className="size-4.5" />
        </IconButton>

        <IconButton
          label="Send a photo"
          onClick={() => imgRef.current?.click()}
          disabled={disabled || uploading}
        >
          <ImageIcon className="size-4.5" />
        </IconButton>

        <textarea
          ref={taRef}
          value={text}
          rows={1}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            signalTyping(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const wantsSend = enterToSend
                ? !e.shiftKey
                : (e.metaKey || e.ctrlKey) && !e.shiftKey;
              if (wantsSend) {
                e.preventDefault();
                void send();
              }
            }
          }}
          placeholder={placeholder}
          aria-label="Message"
          className="max-h-45 min-h-9 flex-1 resize-none bg-transparent px-1.5 py-2 text-[0.9rem] leading-relaxed text-fg outline-none placeholder:text-fg-3"
        />

        <motion.button
          type="button"
          onClick={() => void send()}
          disabled={!text.trim() || sending || disabled}
          whileTap={{ scale: 0.9 }}
          whileHover={text.trim() ? { scale: 1.06 } : undefined}
          aria-label="Send message"
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full transition-all duration-300",
            text.trim() && !disabled
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
      </div>

      <p className="mt-2 px-2 text-center text-[0.62rem] text-fg-3">
        {enterToSend ? "Enter to send · Shift+Enter for a new line" : "Ctrl/⌘ + Enter to send"}
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