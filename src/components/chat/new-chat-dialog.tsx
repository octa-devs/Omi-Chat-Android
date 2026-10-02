"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Users, X, Plus, ArrowUpRight, AtSign } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { searchUsers, findUserByUsername } from "@/lib/supabase/users";
import { createGroupChat, getOrCreateDirectChat } from "@/lib/supabase/chats";
import { cn, errorMessage } from "@/lib/utils";
import type { OmiUser } from "@/lib/types";

export function NewChatDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { uid, profile } = useAuth();
  const [tab, setTab] = useState<"direct" | "group">("direct");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<OmiUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // group state
  const [groupTitle, setGroupTitle] = useState("");
  const [chosen, setChosen] = useState<OmiUser[]>([]);
  const [creating, setCreating] = useState(false);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setTerm("");
      setResults([]);
      setChosen([]);
      setGroupTitle("");
      setTab("direct");
    }
  }, [open]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = term.trim();

    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        // An exact @handle beats a fuzzy name match every time.
        if (q.startsWith("@") && q.length > 1) {
          const exact = await findUserByUsername(q.slice(1));
          setResults(exact ? [exact] : await searchUsers(q.slice(1)));
        } else {
          setResults(await searchUsers(q));
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 380);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [term]);

  const openDirect = async (peer: OmiUser) => {
    if (!uid || !profile) return;
    if (peer.uid === uid) {
      toast.error("That's you! Try someone else.");
      return;
    }
    setBusyId(peer.uid);
    try {
      const id = await getOrCreateDirectChat(
        { uid, displayName: profile.displayName, avatarUrl: profile.avatarUrl },
        {
          uid: peer.uid,
          displayName: peer.displayName,
          username: peer.username,
          avatarUrl: peer.avatarUrl,
        },
      );
      onClose();
      router.push(`/chat/${id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const createGroup = async () => {
    if (!uid || !profile) return;
    if (!groupTitle.trim()) {
      toast.error("Give your group a name.");
      return;
    }
    if (chosen.length === 0) {
      toast.error("Add at least one person.");
      return;
    }
    setCreating(true);
    try {
      const id = await createGroupChat({
        me: { uid, displayName: profile.displayName },
        title: groupTitle.trim(),
        members: chosen.map((c) => ({ uid: c.uid, displayName: c.displayName })),
      });
      toast.success(`${groupTitle.trim()} created`);
      onClose();
      router.push(`/chat/${id}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const candidates = results.filter((u) => u.uid !== uid);
  const available = candidates.filter((u) => !chosen.some((c) => c.uid === u.uid));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tab === "direct" ? "New conversation" : "New group"}
      description={
        tab === "direct"
          ? "Search by name or @username to start chatting."
          : "Name the group and pick the people who belong in it."
      }
      size="md"
      footer={
        tab === "group" ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={creating} onClick={() => void createGroup()}>
              <Users className="size-4" />
              Create group
            </Button>
          </>
        ) : undefined
      }
    >
      {/* tab switch */}
      <div className="glass-subtle mb-5 inline-flex gap-1 rounded-2xl p-1">
        {(
          [
            { key: "direct", label: "Direct message" },
            { key: "group", label: "Group" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative rounded-xl px-4 py-2 text-xs font-medium transition-colors duration-300",
              tab === t.key ? "text-brand-700" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {tab === t.key && (
              <motion.span
                layoutId="new-chat-tab"
                className="absolute inset-0 -z-10 rounded-xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.15)] ring-1 ring-fg/8"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
              />
            )}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "group" && (
        <Field label="Group name" className="mb-4">
          <Input
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            placeholder="Weekend plans"
            icon={<Users className="size-4" />}
            maxLength={40}
          />
        </Field>
      )}

      {chosen.length > 0 && tab === "group" && (
        <div className="mb-4 flex flex-wrap gap-2">
          {chosen.map((c) => (
            <button
              key={c.uid}
              onClick={() => setChosen((p) => p.filter((x) => x.uid !== c.uid))}
              className="glass inline-flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-xs text-fg transition-colors hover:border-rust-400/40"
            >
              <Avatar id={c.uid} name={c.displayName} src={c.avatarUrl} size="xs" />
              {c.displayName}
              <X className="size-3 text-fg-3" />
            </button>
          ))}
        </div>
      )}

      <Input
        autoFocus
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search people — try @aarav"
        icon={<Search className="size-4" />}
      />

      <div className="mt-4 max-h-80 min-h-32 overflow-y-auto">
        <AnimatePresence mode="wait">
          {searching ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3">
                  <div className="skeleton size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3 w-32" />
                    <div className="skeleton h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : available.length === 0 && term.trim() ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-12 text-center"
            >
              <span className="grid size-12 place-items-center rounded-2xl border border-fg/10 bg-ink-800 text-fg-3">
                <AtSign className="size-5" />
              </span>
              <p className="text-sm text-fg-2">
                No one matches <strong className="text-fg">“{term}”</strong>
              </p>
              <p className="max-w-xs text-xs text-fg-3">
                Omi Chat needs an exact @username or at least two letters of a
                display name.
              </p>
            </motion.div>
          ) : available.length === 0 ? (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-12 text-center"
            >
              <span className="grid size-12 place-items-center rounded-2xl border border-fg/10 bg-ink-800 text-fg-3">
                <Search className="size-5" />
              </span>
              <p className="text-sm text-fg-3">
                Start typing to find someone
              </p>
            </motion.div>
          ) : (
            <motion.ul
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              {available.map((u) => (
                <li key={u.uid}>
                  <button
                    onClick={() =>
                      tab === "group"
                        ? setChosen((p) => [...p, u])
                        : void openDirect(u)
                    }
                    className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-fg/7"
                  >
                    <Avatar
                      id={u.uid}
                      name={u.displayName}
                      src={u.avatarUrl}
                      size="md"
                      presence={u.presence}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">
                        {u.displayName}
                      </span>
                      <span className="block truncate text-xs text-fg-3">
                        @{u.username}
                        {u.statusText ? ` · ${u.statusText}` : ""}
                      </span>
                    </span>
                    {busyId === u.uid ? (
                      <Spinner className="size-4" />
                    ) : (
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink-800 text-fg-3 opacity-0 transition-all duration-300 group-hover:opacity-100">
                        {tab === "group" ? (
                          <Plus className="size-4" />
                        ) : (
                          <ArrowUpRight className="size-4" />
                        )}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}