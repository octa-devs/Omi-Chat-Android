"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Phone,
  Video,
  Pin,
  PinOff,
  BellOff,
  Bell,
  UserPlus,
  LogOut,
  ShieldOff,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Switch } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { addChatMembers, leaveChat } from "@/lib/supabase/chats";
import { cn, formatLastSeen } from "@/lib/utils";
import type { OmiChat, OmiUser } from "@/lib/types";

export function ChatInfoPanel({
  open,
  onClose,
  chat,
  members,
  meId,
  onStartCall,
  onTogglePin,
  onToggleMute,
  pinned,
  muted,
}: {
  open: boolean;
  onClose: () => void;
  chat: OmiChat;
  members: OmiUser[];
  meId: string | null;
  onStartCall: (kind: "audio" | "video") => void;
  onTogglePin: () => Promise<void>;
  onToggleMute: () => Promise<void>;
  pinned: boolean;
  muted: boolean;
}) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const peer = members[0];

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
              <h2 className="font-display text-2xl text-fg">Details</h2>
              <button
                onClick={onClose}
                aria-label="Close details"
                className="rounded-full p-2 text-fg-3 transition-colors hover:bg-fg/7 hover:text-fg"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
              {/* identity */}
              <div className="flex flex-col items-center pb-7 text-center">
                <Avatar
                  id={peer?.uid ?? chat.id}
                  name={chat.kind === "group" ? chat.title : peer?.displayName}
                  src={chat.avatarUrl ?? peer?.avatarUrl}
                  size="2xl"
                  presence={chat.kind === "direct" ? (peer?.presence ?? "offline") : undefined}
                  ring
                />
                <h3 className="mt-5 font-display text-3xl leading-tight text-fg">
                  {chat.kind === "group" ? chat.title : (peer?.displayName ?? chat.title)}
                </h3>
                {chat.kind === "direct" && peer && (
                  <p className="mt-1 text-sm text-fg-3">
                    @{peer.username} ·{" "}
                    {peer.presence === "online" ? "online now" : formatLastSeen(peer.lastSeen)}
                  </p>
                )}
                {chat.kind === "group" && (
                  <p className="mt-1 text-sm text-fg-3">
                    Group · {Object.keys(chat.members).length} members
                  </p>
                )}
                {peer?.bio && (
                  <p className="mt-4 max-w-xs text-pretty text-sm text-fg-2">
                    {peer.bio}
                  </p>
                )}
              </div>

              {/* quick call actions */}
              {chat.kind === "direct" && (
                <div className="mb-7 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onStartCall("audio")}
                    className="glass group flex flex-col items-center gap-2 rounded-3xl py-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-400/70"
                  >
                    <Phone className="size-5 text-brand-600 transition-transform duration-500 group-hover:scale-110" />
                    <span className="text-xs text-fg">Audio</span>
                  </button>
                  <button
                    onClick={() => onStartCall("video")}
                    className="glass group flex flex-col items-center gap-2 rounded-3xl py-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-400/70"
                  >
                    <Video className="size-5 text-brand-600 transition-transform duration-500 group-hover:scale-110" />
                    <span className="text-xs text-fg">Video</span>
                  </button>
                </div>
              )}

              {/* preferences */}
              <section className="glass rounded-3xl px-4 py-1">
                <Switch
                  checked={pinned}
                  onChange={() => void onTogglePin()}
                  label="Pin conversation"
                  description="Keep it at the top of your list."
                  icon={pinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
                />
                <div className="hairline" />
                <Switch
                  checked={muted}
                  onChange={() => void onToggleMute()}
                  label="Mute notifications"
                  description="Messages arrive quietly — no sound or badge."
                  icon={muted ? <BellOff className="size-4" /> : <Bell className="size-4" />}
                />
              </section>

              {/* members */}
              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h4 className="text-[0.68rem] font-semibold tracking-[0.2em] text-fg-3 uppercase">
                    {chat.kind === "group" ? `Members · ${members.length + 1}` : "Shared media"}
                  </h4>
                  {chat.kind === "group" && (
                    <button
                      onClick={() => setAddOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs text-brand-600 transition-colors hover:text-brand-700"
                    >
                      <UserPlus className="size-3.5" />
                      Add
                    </button>
                  )}
                </div>

                {chat.kind === "group" ? (
                  <ul className="space-y-1">
                    {members.map((m) => (
                      <li
                        key={m.uid}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-fg/6"
                      >
                        <Avatar
                          id={m.uid}
                          name={m.displayName}
                          src={m.avatarUrl}
                          size="sm"
                          presence={m.presence}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-fg">{m.displayName}</p>
                          <p className="truncate text-xs text-fg-3">@{m.username}</p>
                        </div>
                        {chat.admins?.[m.uid] && (
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.6rem] font-semibold tracking-wide text-brand-600 uppercase">
                            Admin
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="glass rounded-3xl px-4 py-6 text-center">
                    <ImageIcon className="mx-auto size-6 text-fg-3" />
                    <p className="mt-3 text-sm text-fg-2">
                      Photos and files you share appear right here in the thread.
                    </p>
                  </div>
                )}
              </section>

              {/* danger zone */}
              <section className="mt-7 space-y-2">
                <button
                  onClick={() => setLeaveOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm text-rust-600 transition-colors hover:bg-rust-400/10"
                >
                  <LogOut className="size-4" />
                  {chat.kind === "group" ? "Leave group" : "Delete conversation"}
                </button>
                {chat.kind === "direct" && (
                  <button
                    onClick={() =>
                      toast("Blocking lives in Settings", {
                        description: "Open Settings → Privacy to block or unblock people.",
                      })
                    }
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm text-fg-2 transition-colors hover:bg-fg/6 hover:text-fg"
                  >
                    <ShieldOff className="size-4" />
                    Block {peer?.displayName ?? "contact"}
                  </button>
                )}
              </section>
            </div>
          </motion.aside>
        </div>
      )}

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title={chat.kind === "group" ? "Leave this group?" : "Delete this conversation?"}
        description={
          chat.kind === "group"
            ? "You'll stop receiving messages from this group. Other members are unaffected."
            : "The conversation disappears from your list. The other person keeps their copy."
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setLeaveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                if (!meId) return;
                setBusy(true);
                try {
                  await leaveChat(chat.id, meId);
                  toast.success(
                    chat.kind === "group" ? "You left the group" : "Conversation removed",
                  );
                  onClose();
                  if (chat.kind === "group") window.location.href = "/chat";
                } catch {
                  toast.error("Couldn't complete that. Please retry.");
                } finally {
                  setBusy(false);
                  setLeaveOpen(false);
                }
              }}
            >
              {chat.kind === "group" ? "Leave" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-2">
          This cannot be undone. Your messages may still be visible to the other
          participants.
        </p>
      </Modal>

      <AddMembersModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        chat={chat}
        existing={members.map((m) => m.uid)}
      />
    </AnimatePresence>
  );
}

function AddMembersModal({
  open,
  onClose,
  chat,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  chat: OmiChat;
  existing: string[];
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<OmiUser[]>([]);
  const [chosen, setChosen] = useState<OmiUser[]>([]);
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add members"
      description={`Invite more people to ${chat.title}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={chosen.length === 0}
            onClick={async () => {
              setBusy(true);
              try {
                await addChatMembers(
                  chat.id,
                  chosen.map((c) => ({ uid: c.uid, displayName: c.displayName })),
                );
                toast.success(
                  `${chosen.length} ${chosen.length === 1 ? "person" : "people"} added`,
                );
                setChosen([]);
                onClose();
              } catch {
                toast.error("Couldn't add those people.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Add {chosen.length || ""}
          </Button>
        </>
      }
    >
      <Input
        className="mb-4"
        value={term}
        onChange={async (e) => {
          setTerm(e.target.value);
          if (e.target.value.trim().length < 2) {
            setResults([]);
            return;
          }
          const { searchUsers } = await import("@/lib/supabase/users");
          const found = await searchUsers(e.target.value);
          setResults(found.filter((u) => !existing.includes(u.uid)));
        }}
        placeholder="Search by name or @username"
      />

      {chosen.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {chosen.map((c) => (
            <button
              key={c.uid}
              onClick={() => setChosen((prev) => prev.filter((x) => x.uid !== c.uid))}
              className="glass inline-flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-xs text-fg"
            >
              <Avatar id={c.uid} name={c.displayName} src={c.avatarUrl} size="xs" />
              {c.displayName}
              <X className="size-3 text-fg-3" />
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-1">
        {results.map((u) => (
          <li key={u.uid}>
            <button
              onClick={() => {
                setChosen((prev) => [...prev, u]);
                setResults((prev) => prev.filter((x) => x.uid !== u.uid));
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-fg/7",
              )}
            >
              <Avatar id={u.uid} name={u.displayName} src={u.avatarUrl} size="sm" presence={u.presence} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-fg">{u.displayName}</span>
                <span className="block truncate text-xs text-fg-3">@{u.username}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {term.length >= 2 && results.length === 0 && (
        <p className="py-8 text-center text-sm text-fg-3">No one found.</p>
      )}
    </Modal>
  );
}