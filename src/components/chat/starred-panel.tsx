"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, MessageSquare, Image, Paperclip, Phone, Volume2 } from "lucide-react";
import { getStarred, type StarredEntry } from "@/hooks/use-chat-data";
import { cn, formatTime } from "@/lib/utils";
import type { OmiMessage } from "@/lib/types";

function KindIcon({ kind }: { kind: OmiMessage["kind"] }) {
  switch (kind) {
    case "image":    return <Image className="size-3.5 text-brand-500" />;
    case "file":     return <Paperclip className="size-3.5 text-gold-600" />;
    case "call":     return <Phone className="size-3.5 text-mint-600" />;
    case "audio":    return <Volume2 className="size-3.5 text-rust-500" />;
    default:         return <MessageSquare className="size-3.5 text-fg-3" />;
  }
}

/**
 * Feature: Starred Messages Panel
 * Displays all messages the user has starred across all chats.
 * Starred state is persisted in localStorage.
 */
export function StarredPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<StarredEntry[]>([]);

  useEffect(() => {
    if (open) setEntries(getStarred().reverse());
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-40 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-scrim/35 backdrop-blur-md"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="glass-strong grain relative flex h-full w-full max-w-sm flex-col overflow-hidden sm:rounded-l-4xl"
          >
            <header className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <Star className="size-4.5 fill-gold-400 text-gold-500" />
                <h2 className="font-display text-2xl text-fg">Starred</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close starred panel"
                className="rounded-full p-2 text-fg-3 transition-colors hover:bg-fg/7 hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pb-8">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                  <span className="grid size-16 place-items-center rounded-4xl border border-fg/10 bg-ink-800 text-fg-3">
                    <Star className="size-7" />
                  </span>
                  <p className="text-sm font-medium text-fg">No starred messages</p>
                  <p className="text-xs text-fg-3">
                    Hover a message and tap the star icon to save it here.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {entries.map((entry) => (
                    <li key={entry.messageId}>
                      <div className="rounded-2xl border border-fg/8 bg-white/60 px-4 py-3 transition-colors hover:bg-white/80">
                        {/* chat title */}
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[0.65rem] font-semibold text-fg-3 uppercase tracking-wide">
                            <KindIcon kind={entry.kind} />
                            {entry.chatTitle}
                          </span>
                          <span className="text-[0.62rem] text-fg-3 tabular-nums">
                            {formatTime(entry.createdAt)}
                          </span>
                        </div>
                        <p className="text-[0.78rem] font-medium text-fg-2">
                          {entry.senderName}
                        </p>
                        <p className={cn("mt-0.5 text-sm text-fg", !entry.text && "italic text-fg-3")}>
                          {entry.text || "Attachment"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
