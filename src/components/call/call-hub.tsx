"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Video,
  PhoneMissed,
  PhoneOff,
  Search,
  Settings2,
  MessageSquare,
  Sparkles,
  Clock,
  UserRoundSearch,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/ui/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { useCalls } from "@/components/providers/call-provider";
import { useInbox, useDebouncedValue } from "@/hooks/use-chat-data";
import { watchCallLogs } from "@/lib/supabase/calls";
import { searchUsers } from "@/lib/supabase/users";
import type { OmiUser, CallStatus, CallLogEntry } from "@/lib/types";
import {
  directChatId,
  formatDuration,
  formatDayLabel,
  formatTime,
} from "@/lib/utils";

interface Contact {
  uid: string;
  name: string;
  avatarUrl: string | null;
}

const MISSED: CallStatus[] = ["missed", "declined", "busy"];

export function CallHub() {
  const router = useRouter();
  const { uid, profile, loading } = useAuth();
  const { ringing, startCall } = useCalls();
  const { chats, loading: inboxLoading } = useInbox(uid);

  const [logs, setLogs] = useState<CallLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  /* ── auth gate ────────────────────────────────────────────── */
  useEffect(() => {
    if (loading) return;
    if (!uid) router.replace(`/login?next=${encodeURIComponent("/call")}`);
  }, [uid, loading, router]);

  /* ── history ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!uid) {
      setLogs([]);
      setLogsLoading(false);
      return;
    }
    setLogsLoading(true);
    return watchCallLogs(uid, (next) => {
      setLogs(next);
      setLogsLoading(false);
    });
  }, [uid]);

  const handleCall = useCallback(
    async (peerId: string, peerName: string, kind: "audio" | "video") => {
      try {
        await startCall({
          peerId,
          peerName,
          kind,
          chatId: uid ? directChatId(uid, peerId) : null,
        });
      } catch {
        toast.error("Could not start the call. Please try again.");
      }
    },
    [startCall, uid],
  );

  /* ── recent people from the inbox ─────────────────────────── */
  const contacts = useMemo<Contact[]>(() => {
    if (!uid) return [];
    const out: Contact[] = [];
    for (const c of chats) {
      if (c.kind !== "direct") continue;
      const other = Object.keys(c.members ?? {}).find((m) => m !== uid);
      if (!other) continue;
      out.push({ uid: other, name: c.title, avatarUrl: c.avatarUrl });
    }
    return out.slice(0, 12);
  }, [chats, uid]);

  if (loading || (!uid && !profile)) {
    return <PageSkeleton label="Opening calls" />;
  }
  if (!uid) return null;

  return (
    <>
      {/* ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-ink-950" />
        <div className="absolute -top-40 left-1/4 size-150 rounded-full bg-brand-200/60 blur-[150px] animate-float-a" />
        <div className="absolute -bottom-40 right-1/5 size-125 rounded-full bg-[#3670dd]/12 blur-[150px] animate-float-b" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pt-6 pb-16 sm:px-6">
        {/* ── header ── */}
        <header className="flex items-center justify-between gap-4">
          <Link href="/chat" className="transition-opacity hover:opacity-85">
            <Logo size={30} />
          </Link>
          <div className="flex items-center gap-2">
            <ButtonLink href="/chat" variant="ghost" size="sm" className="px-3">
              <MessageSquare className="size-4" />
              <span className="hidden sm:inline">Chats</span>
            </ButtonLink>
            <ButtonLink
              href="/settings"
              variant="ghost"
              size="icon-sm"
              aria-label="Settings"
            >
              <Settings2 className="size-4" />
            </ButtonLink>
          </div>
        </header>

        {/* ── hero ── */}
        <section className="mt-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[0.66rem] font-semibold tracking-[0.2em] text-brand-600 uppercase">
            <Sparkles className="size-3.5" />
            Calls
          </span>
          <h1 className="mt-5 font-display text-[clamp(2.2rem,6vw,3.4rem)] leading-[1.05] tracking-[-0.02em] text-fg text-balance">
            Talk, face to face,{" "}
            <span className="text-gradient-brand">person to person</span>
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-sm leading-relaxed text-fg-2">
            Every call is a direct WebRTC connection — your audio and video never
            pass through a server. Below is your history and everyone you can ring
            right now.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={() => setPickerOpen(true)}>
              <UserRoundSearch className="size-4" />
              New call
            </Button>
            <ButtonLink href="/chat" variant="glass" size="lg">
              <MessageSquare className="size-4" />
              Go to messages
            </ButtonLink>
          </div>
        </section>

        {/* ── active rings ── */}
        <AnimatePresence>
          {ringing.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-10 space-y-2"
            >
              {ringing.map((r) => (
                <div
                  key={r.id}
                  className="glass-strong flex items-center justify-between gap-4 rounded-3xl px-5 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="relative grid size-10 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                      <span className="absolute inset-0 animate-pulse-ring rounded-2xl border border-brand-400/70" />
                      {r.direction === "incoming" ? (
                        <ArrowDownLeft className="size-4.5" />
                      ) : (
                        <ArrowUpRight className="size-4.5" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-fg">
                        {r.direction === "incoming" ? "Incoming" : "Calling"}{" "}
                        {r.peerName}
                      </p>
                      <p className="text-xs text-fg-2">
                        {r.kind === "video" ? "Video" : "Audio"} call in progress
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => router.push(`/call/${r.id}`)}>
                    Open
                  </Button>
                </div>
              ))}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── recent people ── */}
        <section className="mt-12">
          <SectionTitle icon={Phone} title="Start a call" />
          {inboxLoading ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass flex items-center gap-3 rounded-3xl p-4">
                  <div className="skeleton size-11 shrink-0 rounded-full" />
                  <div className="h-3 flex-1 skeleton" />
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="glass mt-5 rounded-4xl px-6 py-10 text-center">
              <p className="text-sm text-fg-2">
                No contacts yet. Start a conversation and the people you talk to
                will show up here.
              </p>
              <ButtonLink href="/chat" variant="glass" size="sm" className="mt-5">
                Open messages
              </ButtonLink>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {contacts.map((c, i) => (
                <motion.div
                  key={c.uid}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass flex items-center justify-between gap-3 rounded-3xl p-4 transition-colors duration-300 hover:border-brand-300"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar id={c.uid} name={c.name} src={c.avatarUrl} size="md" />
                    <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <CallButton
                      label={`Audio call ${c.name}`}
                      onClick={() => void handleCall(c.uid, c.name, "audio")}
                      icon={<Phone className="size-4" />}
                    />
                    <CallButton
                      label={`Video call ${c.name}`}
                      onClick={() => void handleCall(c.uid, c.name, "video")}
                      icon={<Video className="size-4" />}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ── history ── */}
        <section className="mt-14">
          <SectionTitle icon={Clock} title="Recent calls" />
          <div className="mt-5">
            {logsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass flex items-center gap-4 rounded-3xl p-4">
                    <div className="skeleton size-11 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-32 skeleton" />
                      <div className="h-2.5 w-20 skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="glass rounded-4xl px-6 py-12 text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-ink-800 text-fg-3">
                  <PhoneOff className="size-6" />
                </span>
                <p className="mt-5 font-display text-xl text-fg">No calls yet</p>
                <p className="mt-2 text-sm text-fg-2">
                  Your call history will appear here after your first conversation.
                </p>
              </div>
            ) : (
              <ul className="glass divide-y divide-fg/6 overflow-hidden rounded-4xl">
                {logs.map((log) => (
                  <CallLogRow
                    key={log.id}
                    log={log}
                    onRedial={() => void handleCall(log.peerId, log.peerName, log.kind)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <NewCallDialog open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}

/* ── sub-components ──────────────────────────────────────────── */

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: typeof Phone;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2.5 text-[0.7rem] font-semibold tracking-[0.2em] text-fg-3 uppercase">
      <Icon className="size-4 text-brand-600" />
      {title}
    </h2>
  );
}

function CallButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full bg-ink-800 text-fg-2 transition-all duration-300 hover:scale-105 hover:bg-brand-100 hover:text-brand-700"
    >
      {icon}
    </button>
  );
}

function CallLogRow({
  log,
  onRedial,
}: {
  log: CallLogEntry;
  onRedial: () => void;
}) {
  const isMissed = MISSED.includes(log.status);

  return (
    <li className="flex items-center gap-4 px-4 py-3.5 transition-colors duration-300 hover:bg-fg/[0.03] sm:px-5">
      <Avatar id={log.peerId} name={log.peerName} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-fg">{log.peerName}</p>
          {isMissed && (
            <span className="rounded-full bg-rust-100 px-2 py-0.5 text-[0.6rem] font-medium tracking-wide text-rust-600 uppercase">
              {log.status}
            </span>
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-fg-3">
          {log.direction === "incoming" ? (
            isMissed ? (
              <PhoneMissed className="size-3.5 text-rust-600" />
            ) : (
              <ArrowDownLeft className="size-3.5 text-mint-600" />
            )
          ) : (
            <ArrowUpRight className="size-3.5 text-brand-600" />
          )}
          {log.kind === "video" ? "Video" : "Audio"}
          <span className="text-muted">·</span>
          {formatDayLabel(log.startedAt)} {formatTime(log.startedAt)}
          {log.durationSec > 0 && (
            <>
              <span className="text-muted">·</span>
              {formatDuration(log.durationSec)}
            </>
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={onRedial}
        aria-label={`Call ${log.peerName} again`}
        title="Call again"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-800 text-fg-2 transition-all duration-300 hover:scale-105 hover:bg-brand-100 hover:text-brand-700"
      >
        {log.kind === "video" ? <Video className="size-4" /> : <Phone className="size-4" />}
      </button>
    </li>
  );
}

/* ── new call dialog ─────────────────────────────────────────── */

function NewCallDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { uid, profile } = useAuth();
  const { startCall } = useCalls();
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 320);
  const [results, setResults] = useState<OmiUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!open) return;
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    void searchUsers(debounced)
      .then((found) => {
        if (alive) setResults(found.filter((u) => u.uid !== uid));
      })
      .catch(() => {
        if (alive) setResults([]);
      })
      .finally(() => {
        if (alive) setSearching(false);
      });
    return () => {
      alive = false;
    };
  }, [debounced, open, uid]);

  const call = async (u: OmiUser, kind: "audio" | "video") => {
    setBusy(`${u.uid}:${kind}`);
    try {
      await startCall({
        peerId: u.uid,
        peerName: u.displayName,
        kind,
        chatId: uid ? directChatId(uid, u.uid) : null,
      });
      onClose();
    } catch {
      toast.error("Could not start the call. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start a call"
      description="Search by name or @username, then choose audio or video."
    >
      <Input
        autoFocus
        icon={<Search className="size-4" />}
        placeholder="Search people…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />

      <div className="mt-5 min-h-40">
        {term.trim().length < 2 ? (
          <div className="grid place-items-center py-10 text-center">
            <UserRoundSearch className="size-7 text-fg-3" />
            <p className="mt-3 text-sm text-fg-3">
              Type at least two characters to find someone.
            </p>
          </div>
        ) : searching ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="size-5 animate-spin text-brand-600" />
          </div>
        ) : results.length === 0 ? (
          <div className="grid place-items-center py-10 text-center">
            <p className="text-sm text-fg-3">No one matches “{term.trim()}”.</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {results.map((u) => (
              <li
                key={u.uid}
                className="flex items-center justify-between gap-3 rounded-2xl px-2.5 py-2.5 transition-colors hover:bg-fg/5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    id={u.uid}
                    name={u.displayName}
                    src={u.avatarUrl}
                    size="md"
                    presence={u.presence}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fg">
                      {u.displayName}
                    </p>
                    <p className="truncate text-xs text-fg-3">@{u.username}</p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <CallButton
                    label={`Audio call ${u.displayName}`}
                    onClick={() => void call(u, "audio")}
                    icon={
                      busy === `${u.uid}:audio` ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Phone className="size-4" />
                      )
                    }
                  />
                  <CallButton
                    label={`Video call ${u.displayName}`}
                    onClick={() => void call(u, "video")}
                    icon={
                      busy === `${u.uid}:video` ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Video className="size-4" />
                      )
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {profile && (
        <p className="mt-4 text-center text-[0.7rem] text-fg-3">
          Calling as @{profile.username}
        </p>
      )}
    </Modal>
  );
}
