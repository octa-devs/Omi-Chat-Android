"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareDashed, Plus, Users, Sparkles } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/skeleton";
import { ChatSidebar } from "./chat-sidebar";
import { Conversation } from "./conversation";
import { NewChatDialog } from "./new-chat-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useInbox } from "@/hooks/use-chat-data";
import { cn } from "@/lib/utils";

export function ChatWorkspace({ chatId }: { chatId: string | null }) {
  const router = useRouter();
  const { uid, loading, profile } = useAuth();
  const { chats, loading: inboxLoading } = useInbox(uid);
  const [newChatOpen, setNewChatOpen] = useState(false);

  /* Auth gate — everything here needs a session. */
  useEffect(() => {
    if (loading) return;
    if (!uid) {
      const next = chatId ? `/chat/${chatId}` : "/chat";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [uid, loading, router, chatId]);

  const [selected, setSelected] = useState<string | null>(chatId);
  useEffect(() => setSelected(chatId), [chatId]);

  if (loading || (!uid && !profile)) {
    return <PageSkeleton label="Opening Omi Chat" />;
  }
  if (!uid) return null;

  const openNewChat = () => setNewChatOpen(true);

  return (
    <>
      {/* ambient backdrop for the app shell */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-ink-950" />
        <div className="absolute -top-40 left-1/4 size-150 rounded-full bg-brand-200/60 blur-[150px] animate-float-a" />
        <div className="absolute -bottom-40 right-1/5 size-125 rounded-full bg-[#3670dd]/12 blur-[150px] animate-float-b" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="flex h-dvh overflow-hidden p-0 lg:gap-3 lg:p-3">
        {/* ── sidebar ── */}
        <aside
          className={cn(
            "glass grain h-full w-full shrink-0 overflow-hidden lg:w-[21.5rem] lg:rounded-4xl",
            selected ? "hidden lg:block" : "block",
          )}
        >
          <ChatSidebar
            chats={chats}
            loading={inboxLoading}
            activeChatId={selected}
            onNewChat={openNewChat}
            onNewGroup={openNewChat}
          />
        </aside>

        {/* ── conversation ── */}
        <main
          className={cn(
            "glass grain h-full min-w-0 flex-1 overflow-hidden lg:rounded-4xl",
            selected ? "block" : "hidden lg:block",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div
                key={selected}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <Conversation
                  chatId={selected}
                  onBack={() => {
                    setSelected(null);
                    router.push("/chat");
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <EmptyConversation
                  onNewChat={openNewChat}
                  hasChats={chats.length > 0}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} />
    </>
  );
}

function EmptyConversation({
  onNewChat,
  hasChats,
}: {
  onNewChat: () => void;
  hasChats: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <span className="absolute inset-0 -z-10 rounded-full bg-brand-200 blur-3xl" />
        <Logo variant="mark" size={88} priority />
      </motion.div>

      <h2 className="mt-8 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight text-fg text-balance">
        {hasChats ? (
          <>
            Pick a conversation, or{" "}
            <span className="text-gradient-brand">start a new one</span>
          </>
        ) : (
          <>
            Your messages will live{" "}
            <span className="text-gradient-brand">right here</span>
          </>
        )}
      </h2>

      <p className="mt-4 max-w-sm text-pretty text-sm leading-relaxed text-fg-3">
        Search for someone by name or @username and open a private thread instantly.
        Or spin up a group and bring everyone in.
      </p>

      <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
        <Button size="lg" onClick={onNewChat}>
          <Plus className="size-4" />
          New conversation
        </Button>
        <ButtonLink href="/call" variant="glass" size="lg">
          <Sparkles className="size-4" />
          Call history
        </ButtonLink>
      </div>

      <div className="mt-14 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { icon: MessageSquareDashed, title: "Realtime", body: "Messages land instantly" },
          { icon: Users, title: "Groups", body: "Bring the whole crew" },
          { icon: Sparkles, title: "Calls", body: "Voice, video, screen share" },
        ].map(({ icon: Icon, title, body }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="glass rounded-3xl px-4 py-5 text-center"
          >
            <Icon className="mx-auto size-4.5 text-brand-600" />
            <p className="mt-3 text-sm font-medium text-fg">{title}</p>
            <p className="mt-1 text-xs text-fg-3">{body}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}