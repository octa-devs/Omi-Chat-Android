"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, Video, PhoneOff, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useAuth } from "./providers/auth-provider";
import { acceptCall } from "@/lib/supabase/calls";
import { playRingtone, playEndTone } from "@/lib/ringtone";
import { Avatar } from "./ui/avatar";
import { Button } from "./ui/button";
import type { RingingCall } from "./providers/call-provider";

/**
 * Global incoming-call surface. Mounted once in <CallProvider> so a call can
 * reach the user no matter which page they are on.
 */
export function IncomingCallOverlay({
  call,
  onDecline,
}: {
  call: RingingCall | null;
  onDecline: (call: RingingCall) => void | Promise<void>;
}) {
  const router = useRouter();
  const { uid } = useAuth();
  const [mounted, setMounted] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => setMounted(true), []);

  /* ringtone loop while a call is ringing */
  useEffect(() => {
    if (!call) {
      stopRef.current?.();
      stopRef.current = null;
      return;
    }
    stopRef.current = playRingtone(true);
    return () => {
      stopRef.current?.();
      stopRef.current = null;
      playEndTone();
    };
  }, [call?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted || !call) return null;

  const accept = async () => {
    if (uid) await acceptCall(call.id, uid).catch(() => undefined);
    stopRef.current?.();
    router.push(`/call/${call.id}`);
  };

  return createPortal(
    <AnimatePresence>
      {call && (
        <motion.div
          key={call.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-90 flex items-start justify-center px-4 pt-[14dvh]"
        >
          <motion.div
            initial={{ scale: 0.86, y: -26, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: -14, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="glass-strong grain pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-4xl p-7 text-center shadow-[0_40px_100px_-30px_rgba(19,23,37,0.26)]"
          >
            {/* expanding rings */}
            <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-40 -translate-x-1/2 -translate-y-1/2">
              {[0, 0.8, 1.6].map((delay) => (
                <span
                  key={delay}
                  className="absolute inset-0 rounded-full border border-brand-500/70 animate-pulse-ring"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>

            <button
              onClick={() => void onDecline(call)}
              aria-label="Dismiss call"
              className="absolute top-4 right-4 rounded-full p-1.5 text-fg-3 transition-colors hover:bg-fg/7 hover:text-fg"
            >
              <X className="size-4" />
            </button>

            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto mb-5 w-fit"
            >
              <Avatar
                id={call.peerId}
                name={call.peerName}
                size="2xl"
                ring
                className="shadow-[0_0_50px_-8px_var(--color-brand-500)]"
              />
            </motion.div>

            <p className="text-[0.68rem] font-semibold tracking-[0.24em] text-brand-600 uppercase">
              Incoming {call.kind} call
            </p>
            <h2 className="mt-2 font-display text-3xl leading-tight text-fg">
              {call.peerName}
            </h2>
            <p className="mt-1.5 text-sm text-fg-3">Omi Chat is ringing…</p>

            <div className="mt-7 flex items-center justify-center gap-4">
              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.06 }}
                onClick={() => void onDecline(call)}
                aria-label="Decline call"
                className="grid size-15 place-items-center rounded-full bg-[linear-gradient(140deg,var(--color-rust-400),var(--color-rust-500))] text-on-accent shadow-[0_16px_44px_-12px_rgba(224,51,79,0.32)]"
              >
                <PhoneOff className="size-6" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.06 }}
                onClick={() => void accept()}
                aria-label="Accept call"
                className="grid size-15 place-items-center rounded-full bg-[linear-gradient(140deg,var(--color-mint-400),var(--color-mint-500))] text-[#06231f] shadow-[0_16px_40px_-14px_rgba(22,163,148,0.45)]"
              >
                {call.kind === "video" ? (
                  <Video className="size-6" />
                ) : (
                  <Phone className="size-6" />
                )}
              </motion.button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="mt-6 text-fg-3"
              onClick={() => void onDecline(call)}
            >
              Not now
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

