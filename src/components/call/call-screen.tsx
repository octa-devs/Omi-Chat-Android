"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  Phone,
  Maximize2,
  WifiOff,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import {
  acceptCall,
  endCall,
  watchCall,
  watchCallRingEntry,
} from "@/lib/supabase/calls";
import type { CallRingEntry } from "@/lib/supabase/calls";
import { useWebRTC, type CallPhase } from "@/hooks/use-webrtc";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/skeleton";
import { playEndTone } from "@/lib/ringtone";
import { cn, formatDuration, errorMessage } from "@/lib/utils";
import type { CallRecord } from "@/lib/types";

const PHASE_COPY: Record<CallPhase, string> = {
  idle: "Preparing…",
  "requesting-media": "Requesting camera & microphone…",
  "ringing-out": "Ringing…",
  waiting: "Connecting…",
  connecting: "Connecting…",
  active: "",
  reconnecting: "Reconnecting…",
  failed: "Call failed",
  ended: "Call ended",
};

export function CallScreen({ callId }: { callId: string }) {
  const router = useRouter();
  const { uid, profile, loading } = useAuth();

  const [call, setCall] = useState<CallRecord | null>(null);
  const [ring, setRing] = useState<CallRingEntry | null>(null);
  const [ringReady, setRingReady] = useState(false);
  const [loadingCall, setLoadingCall] = useState(true);
  const [ended, setEnded] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  const finishedRef = useRef(false);
  const startedRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  /* ── auth gate ────────────────────────────────────────────── */
  useEffect(() => {
    if (loading) return;
    if (!uid) {
      router.replace(`/login?next=${encodeURIComponent(`/call/${callId}`)}`);
    }
  }, [uid, loading, router, callId]);

  /* ── live call record ─────────────────────────────────────── */
  useEffect(() => {
    if (!uid) return;
    setLoadingCall(true);
    const unwatch = watchCall(callId, (next) => {
      setCall(next);
      setLoadingCall(false);
    });
    return unwatch;
  }, [callId, uid]);

  useEffect(() => {
    if (!uid) return;
    return watchCallRingEntry(uid, callId, (entry) => {
      setRing(entry);
      setRingReady(true);
    });
  }, [uid, callId]);

  const searchParams = useSearchParams();
  const queryPeerId = searchParams?.get("peerId") ?? null;
  const queryPeerName = searchParams?.get("peerName") ?? null;
  const queryKind = (searchParams?.get("kind") as "audio" | "video" | null) ?? null;
  const queryCaller = searchParams?.get("caller") === "1" || searchParams?.get("caller") === "true";

  /* ── who am I talking to? ─────────────────────────────────── */
  const peerId = useMemo(() => {
    if (ring?.peerId) return ring.peerId;
    if (call && uid) {
      const found = Object.keys(call.members).find((m) => m !== uid);
      if (found) return found;
      if (call.initiatedBy && call.initiatedBy !== uid) return call.initiatedBy;
    }
    return queryPeerId || null;
  }, [ring, call, uid, queryPeerId]);

  const peerName = ring?.peerName ?? queryPeerName ?? "Omi contact";
  const isCaller = (call && uid) ? (call.initiatedBy === uid) : queryCaller;
  const answered = Boolean(call?.answeredAt) || ring?.status === "active";
  const kind = (call?.kind ?? ring?.kind ?? queryKind ?? "audio") as "audio" | "video";

  // The caller starts immediately; callee starts once on the call screen or accepted
  const engineActive = Boolean(uid && peerId && !call?.endedAt && (isCaller || answered || !queryCaller));

  /* ── teardown on unmount ──────────────────────────────────── */
  const finish = useCallback(
    async (reason: "ended" | "declined" | "missed") => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      playEndTone();
      setEnded(true);
      if (uid) {
        await endCall(callId, uid, reason).catch(() => undefined);
      }
      setTimeout(() => router.replace("/call"), 1100);
    },
    [callId, uid, router],
  );

  const rtc = useWebRTC({
    callId: engineActive ? callId : null,
    selfUid: uid,
    peerUid: peerId,
    kind,
    isCaller,
    onRemoteEnded: () => void finish("ended"),
  });

  /* ── timers ───────────────────────────────────────────────── */
  useEffect(() => {
    if (rtc.phase !== "active") return;
    if (startedRef.current == null) startedRef.current = Date.now();
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (startedRef.current ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [rtc.phase]);

  /* ── the other side ended the call ────────────────────────── */
  useEffect(() => {
    if (call?.endedAt && !finishedRef.current) {
      finishedRef.current = true;
      setEnded(true);
      playEndTone();
      setTimeout(() => router.replace("/call"), 1100);
    }
  }, [call?.endedAt, router]);

  /* ── element bindings ─────────────────────────────────────── */
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = remoteVideo.current;
    if (el && rtc.remoteStream && el.srcObject !== rtc.remoteStream) {
      el.srcObject = rtc.remoteStream;
      void el.play().catch(() => undefined);
    }
  }, [rtc.remoteStream]);

  useEffect(() => {
    const el = localVideo.current;
    if (el && rtc.localStream && el.srcObject !== rtc.localStream) {
      el.srcObject = rtc.localStream;
      void el.play().catch(() => undefined);
    }
  }, [rtc.localStream]);

  /* ── keyboard: press M / V / Escape ───────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key.toLowerCase() === "m") rtc.toggleMic();
      if (e.key.toLowerCase() === "v") rtc.toggleCam();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rtc]);

  const hangup = useCallback(() => {
    void rtc.hangup();
    void finish(isCaller && !answered ? "missed" : "ended");
  }, [rtc, finish, isCaller, answered]);

  const accept = useCallback(async () => {
    if (!uid) return;
    try {
      await acceptCall(callId, uid);
    } catch (e) {
      setEndError(errorMessage(e));
    }
  }, [callId, uid]);

  /* ── render guards ────────────────────────────────────────── */
  if (loading || (!uid && !profile)) {
    return <PageSkeleton label="Joining call" />;
  }
  if (!uid) return null;

  if (loadingCall && !call) {
    return <PageSkeleton label="Joining call" />;
  }

  if (!call) {
    return (
      <CallShell>
        <div className="flex max-w-sm flex-col items-center text-center">
          <span className="grid size-16 place-items-center rounded-3xl bg-white/10 text-white/85">
            <WifiOff className="size-7" />
          </span>
          <h1 className="mt-6 font-display text-3xl text-white">
            This call has ended
          </h1>
          <p className="mt-3 text-sm text-white/70">
            The room no longer exists. Start a fresh call from any conversation.
          </p>
          <div className="mt-8 flex gap-3">
            <ButtonLink href="/chat" variant="primary">
              Back to chats
            </ButtonLink>
            <ButtonLink href="/call" variant="glass">
              Call history
            </ButtonLink>
          </div>
        </div>
      </CallShell>
    );
  }

  if (!ringReady) {
    return <PageSkeleton label="Joining call" />;
  }

  const needsAccept = !isCaller && !answered && !call.endedAt && ringReady;
  const showVideo = kind === "video" && (rtc.phase === "active" || Boolean(rtc.remoteStream));
  const statusText = ended
    ? "Call ended"
    : rtc.phase === "active"
      ? formatDuration(elapsed)
      : PHASE_COPY[rtc.phase];

  return (
    <CallShell>
      {/* ── remote media ── */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className={cn(
            "size-full object-cover transition-opacity duration-700",
            showVideo && rtc.remoteStream ? "opacity-100" : "opacity-0",
          )}
        />
        {!showVideo && (
          <div className="absolute inset-0 grid place-items-center">
            <PulseAvatar id={peerId ?? peerName} name={peerName} muted={rtc.remoteMuted} />
          </div>
        )}
        {/* readability gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.45),transparent_30%,transparent_60%,rgba(0,0,0,0.5))]" />
        <div className="grain pointer-events-none absolute inset-0" />
      </div>

      {/* ── top bar ── */}
      <header className="relative z-20 flex items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <div className="flex items-center gap-3">
          <Avatar
            id={peerId ?? undefined}
            name={peerName}
            size="sm"
            ring
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{peerName}</p>
            <p className="flex items-center gap-1.5 text-xs text-white/70">
              {rtc.phase === "active" ? (
                <>
                  <span className="size-1.5 rounded-full bg-mint-400 shadow-[0_0_8px_var(--color-mint-400)]" />
                  {statusText}
                </>
              ) : rtc.phase === "failed" || rtc.phase === "reconnecting" ? (
                <>
                  <AlertTriangle className="size-3 text-gold-300" />
                  {statusText}
                </>
              ) : (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  {statusText}
                </>
              )}
            </p>
          </div>
        </div>

        <span className="hidden items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5 text-[0.68rem] font-medium tracking-wide text-white/85 uppercase backdrop-blur-xl sm:inline-flex">
          <ShieldCheck className="size-3.5 text-mint-300" />
          Peer-to-peer
        </span>
      </header>

      {/* ── error toast ── */}
      <AnimatePresence>
        {(rtc.error || endError) && !ended && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-24 left-1/2 z-30 flex max-w-sm -translate-x-1/2 items-start gap-3 rounded-2xl border border-white/15 bg-black/60 px-4 py-3 text-left backdrop-blur-2xl"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rust-300" />
            <p className="text-xs leading-relaxed text-white/90">
              {endError ?? rtc.error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── local preview ── */}
      {kind === "video" && rtc.localStream && (
        <motion.div
          drag
          dragConstraints={{ top: -300, bottom: 300, left: -300, right: 300 }}
          dragElastic={0.12}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-24 right-5 z-20 w-28 overflow-hidden rounded-3xl border border-white/15 bg-black/60 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] sm:w-44"
        >
          <video
            ref={localVideo}
            autoPlay
            playsInline
            muted
            className="aspect-[3/4] size-full scale-x-[-1] object-cover"
          />
          {!rtc.camOn && (
            <div className="absolute inset-0 grid place-items-center bg-black/70">
              <VideoOff className="size-5 text-white/85" />
            </div>
          )}
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-[0.6rem] font-medium tracking-wide text-white/90 uppercase">
            You
          </span>
        </motion.div>
      )}

      {/* ── accept / decline (callee pre-answer) ── */}
      <AnimatePresence>
        {needsAccept && (
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-6 px-6 pb-12"
          >
            <p className="text-sm text-white/75">
              Incoming {kind} call from{" "}
              <span className="text-white">{peerName}</span>
            </p>
            <div className="flex items-center gap-6">
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.06 }}
                onClick={() => void finish("declined")}
                aria-label="Decline call"
                className="grid size-16 place-items-center rounded-full bg-[linear-gradient(140deg,var(--color-rust-400),var(--color-rust-500))] text-on-accent shadow-[0_18px_50px_-12px_rgba(224,51,79,0.32)]"
              >
                <PhoneOff className="size-7" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.06 }}
                onClick={() => void accept()}
                aria-label="Accept call"
                className="grid size-16 place-items-center rounded-full bg-[linear-gradient(140deg,var(--color-mint-400),var(--color-mint-500))] text-[#06231f] shadow-[0_18px_50px_-12px_rgba(22,163,148,0.45)]"
              >
                {kind === "video" ? (
                  <VideoIcon className="size-7" />
                ) : (
                  <Phone className="size-7" />
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ended overlay ── */}
      <AnimatePresence>
        {ended && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 grid place-items-center bg-black/75 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center text-center"
            >
              <Avatar id={peerId ?? undefined} name={peerName} size="xl" />
              <h2 className="mt-6 font-display text-3xl text-white">Call ended</h2>
              <p className="mt-2 text-sm text-white/70">
                {rtc.phase === "active" && elapsed > 0
                  ? `Lasted ${formatDuration(elapsed)}`
                  : isCaller
                    ? "The call did not connect"
                    : "You left the call"}
              </p>
              <Button
                className="mt-8"
                variant="glass"
                onClick={() => router.replace("/call")}
              >
                Back to calls
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── control dock ── */}
      {!needsAccept && !ended && (
        <motion.footer
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-5 px-5 pb-9"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-white/12 bg-white/10 px-3 py-2.5 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:gap-3.5 sm:px-4">
            <DockButton
              label={rtc.micOn ? "Mute microphone" : "Unmute microphone"}
              active={!rtc.micOn}
              onClick={rtc.toggleMic}
              icon={rtc.micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            />
            <DockButton
              label={rtc.camOn ? "Turn camera off" : "Turn camera on"}
              active={!rtc.camOn}
              onClick={rtc.toggleCam}
              disabled={kind !== "video"}
              icon={rtc.camOn ? <VideoIcon className="size-5" /> : <VideoOff className="size-5" />}
            />
            <DockButton
              label={rtc.screenOn ? "Stop sharing screen" : "Share your screen"}
              active={rtc.screenOn}
              onClick={() => void rtc.toggleScreen()}
              disabled={kind !== "video" && !rtc.screenOn}
              icon={rtc.screenOn ? <MonitorX className="size-5" /> : <MonitorUp className="size-5" />}
            />
            <DockButton
              label="Fullscreen"
              onClick={() => void document.documentElement.requestFullscreen?.().catch(() => undefined)}
              icon={<Maximize2 className="size-5" />}
            />

            <span className="mx-1 h-8 w-px bg-white/20" />

            <motion.button
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.05 }}
              onClick={hangup}
              aria-label="End call"
              className="grid size-13 place-items-center rounded-full bg-[linear-gradient(140deg,var(--color-rust-400),var(--color-rust-500))] text-on-accent shadow-[0_16px_44px_-12px_rgba(224,51,79,0.32)]"
            >
              <PhoneOff className="size-6" />
            </motion.button>
          </div>

          <p className="text-[0.68rem] tracking-wide text-white/60">
            Press <kbd className="rounded bg-white/12 px-1.5 py-0.5 text-white/85">M</kbd> to
            mute ·{" "}
            <kbd className="rounded bg-white/12 px-1.5 py-0.5 text-white/85">V</kbd> for video
          </p>
        </motion.footer>
      )}
    </CallShell>
  );
}

/* ── sub-components ──────────────────────────────────────────── */

/**
 * The in-call surface stays dark on purpose — remote video is the backdrop,
 * and light chrome around a camera feed reads as washed out.
 */
function CallShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#0b0e17] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/4 size-150 rounded-full bg-brand-300/60 blur-[150px] animate-float-a" />
        <div className="absolute -bottom-40 right-1/5 size-125 rounded-full bg-brand-800/30 blur-[150px] animate-float-b" />
      </div>
      {children}
    </div>
  );
}

function PulseAvatar({
  id,
  name,
  muted,
}: {
  id: string;
  name: string;
  muted?: boolean;
}) {
  return (
    <div className="relative flex flex-col items-center">
      <div className="pointer-events-none absolute top-1/2 left-1/2 size-52 -translate-x-1/2 -translate-y-1/2">
        {[0, 0.9, 1.8].map((d) => (
          <span
            key={d}
            className="absolute inset-0 rounded-full border border-brand-400/55 animate-pulse-ring"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      </div>
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Avatar id={id} name={name} size="2xl" ring />
      </motion.div>
      <h1 className="mt-8 font-display text-4xl text-white">{name}</h1>
      {muted && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs text-white/85">
          <MicOff className="size-3.5 text-rust-300" />
          Microphone muted
        </span>
      )}
    </div>
  );
}

function DockButton({
  label,
  icon,
  onClick,
  active,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
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
        "grid size-12 place-items-center rounded-full transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30",
        active
          ? "bg-[linear-gradient(140deg,var(--color-brand-400),var(--color-brand-600))] text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)]"
          : "bg-white/10 text-white/90 hover:bg-white/20 hover:text-white",
      )}
    >
      {icon}
    </button>
  );
}
