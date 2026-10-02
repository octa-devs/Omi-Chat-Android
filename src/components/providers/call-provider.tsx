"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "./auth-provider";
import {
  endCall,
  placeCall,
  watchCallRing,
} from "@/lib/supabase/calls";
import type { CallRingEntry } from "@/lib/supabase/calls";
import { IncomingCallOverlay } from "../incoming-call-overlay";

export type RingingCall = CallRingEntry;

interface CallContextValue {
  ringing: RingingCall[];
  incoming: RingingCall | null;
  startCall: (input: {
    peerId: string;
    peerName: string;
    kind: "audio" | "video";
    chatId: string | null;
  }) => Promise<string>;
  decline: (call: RingingCall) => Promise<void>;
  hangup: (callId: string) => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { uid, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isCallPage = Boolean(pathname?.startsWith("/call"));
  const [ringing, setRinging] = useState<RingingCall[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, true>>({});

  useEffect(() => {
    if (!uid) {
      setRinging([]);
      return;
    }
    return watchCallRing(uid, (entries) => setRinging(entries));
  }, [uid]);

  const incoming = useMemo(
    () => ringing.find((c) => c.direction === "incoming" && c.peerId !== uid) ?? null,
    [ringing, uid],
  );

  // Hide anything the user already rejected in this session or when already on call screen.
  const visibleIncoming = useMemo(
    () => (!isCallPage && incoming && !dismissed[incoming.id] ? incoming : null),
    [isCallPage, incoming, dismissed],
  );

  const startCall = useCallback<CallContextValue["startCall"]>(
    async (input) => {
      if (!uid) throw new Error("You must be signed in to call someone.");
      if (input.peerId === uid) {
        throw new Error("You cannot start a call with yourself.");
      }
      const callerDisplayName = profile?.displayName || profile?.username || "You";
      const callId = await placeCall({
        callerId: uid,
        callerName: callerDisplayName,
        peerId: input.peerId,
        peerName: input.peerName,
        kind: input.kind,
        chatId: input.chatId,
      });
      router.push(
        `/call/${callId}?caller=1&peerId=${encodeURIComponent(input.peerId)}&peerName=${encodeURIComponent(input.peerName)}&kind=${input.kind}`,
      );
      return callId;
    },
    [uid, profile, router],
  );

  const decline = useCallback<CallContextValue["decline"]>(
    async (call) => {
      setDismissed((d) => ({ ...d, [call.id]: true }));
      await endCall(call.id, uid ?? "unknown", "declined").catch(() => undefined);
      if (call.chatId) {
        toast("Missed call", {
          description: `You declined ${call.kind} call from ${call.peerName}.`,
        });
      }
    },
    [uid],
  );

  const hangup = useCallback<CallContextValue["hangup"]>(
    async (callId) => {
      await endCall(callId, uid ?? "unknown", "ended").catch(() => undefined);
    },
    [uid],
  );

  const value = useMemo(
    () => ({ ringing, incoming: visibleIncoming, startCall, decline, hangup }),
    [ringing, visibleIncoming, startCall, decline, hangup],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      <IncomingCallOverlay call={visibleIncoming} onDecline={decline} />
    </CallContext.Provider>
  );
}

export function useCalls() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCalls must be used inside <CallProvider>");
  return ctx;
}