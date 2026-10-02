"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Forward, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { useInbox } from "@/hooks/use-chat-data";
import { sendMessage } from "@/lib/supabase/chats";
import { errorMessage } from "@/lib/utils";
import type { OmiMessage } from "@/lib/types";

/**
 * Feature: Forward Dialog
 * Lets a user pick one or more conversations to forward a message to.
 */
export function ForwardDialog({
  message,
  onClose,
}: {
  message: OmiMessage;
  onClose: () => void;
}) {
  const { uid, profile } = useAuth();
  const { chats } = useInbox(uid);
  const [term, setTerm] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [forwarding, setForwarding] = useState(false);

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return chats;
    return chats.filter((c) => c.title.toLowerCase().includes(needle));
  }, [chats, term]);

  const toggle = (chatId: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  };

  const forward = async () => {
    if (!uid || !profile || selected.size === 0) return;
    setForwarding(true);
    try {
      const targets = chats.filter((c) => selected.has(c.id));
      await Promise.all(
        targets.map((chat) =>
          sendMessage({
            chat,
            senderId: uid,
            senderName: profile.displayName,
            text: message.text,
            kind: message.kind,
            attachmentUrl: message.attachmentUrl,
            attachmentName: message.attachmentName,
            attachmentSize: message.attachmentSize,
          }),
        ),
      );
      toast.success(`Forwarded to ${selected.size} ${selected.size === 1 ? "chat" : "chats"}`);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setForwarding(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-50 flex items-end justify-center sm:items-center">
        {/* backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-scrim/40 backdrop-blur-md"
        />

        {/* sheet */}
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 34 }}
          className="glass-strong relative z-10 flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-t-4xl sm:rounded-4xl"
        >
          {/* header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <Forward className="size-4.5 text-brand-600" />
              <h2 className="font-display text-xl text-fg">Forward message</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2 text-fg-3 transition-colors hover:bg-fg/7"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* preview of what's being forwarded */}
          <div className="mx-5 mb-3 rounded-2xl border border-fg/10 bg-ink-800/50 px-3 py-2">
            <p className="text-[0.7rem] font-medium text-fg-3 uppercase tracking-wide">
              Forwarding
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm text-fg-2">
              {message.text || (message.kind === "image" ? "Photo" : message.kind === "audio" ? "Voice message" : "Attachment")}
            </p>
          </div>

          {/* search */}
          <div className="px-5 pb-3">
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search conversations"
              icon={<Search className="size-4" />}
              className="h-10"
            />
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {filtered.map((chat) => {
              const sel = selected.has(chat.id);
              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => toggle(chat.id)}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-fg/[0.04]"
                >
                  <Avatar id={chat.id} name={chat.title} src={chat.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{chat.title}</span>
                  <span
                    className={`grid size-5 place-items-center rounded-full border-2 transition-colors ${
                      sel
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-fg/25"
                    }`}
                  >
                    {sel && <CheckCheck className="size-3" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* footer */}
          <div className="border-t border-fg/8 px-5 py-4">
            <Button
              className="w-full"
              disabled={selected.size === 0 || forwarding}
              onClick={() => void forward()}
            >
              {forwarding ? "Forwarding…" : `Forward to ${selected.size || ""} ${selected.size === 1 ? "chat" : "chats"}`}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
