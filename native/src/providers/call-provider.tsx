import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "expo-router";
import { useAuth } from "./auth-provider";
import {
  acceptCall as acceptCallDb,
  declineCall as declineCallDb,
  endCall as endCallDb,
  initiateCall,
  watchIncomingCalls,
  type RingRow,
} from "../lib/supabase/calls";
import { getUser } from "../lib/supabase/users";
import type { CallStatus } from "../lib/types";

export interface RingingCall {
  id: string;
  kind: "audio" | "video";
  peerId: string;
  peerName: string;
  direction: "incoming" | "outgoing";
  chatId: string | null;
}

interface CallContextValue {
  ringing: RingingCall[];
  incomingCall: RingingCall | null;
  startCall: (input: {
    peerId: string;
    peerName: string;
    kind: "audio" | "video";
    chatId: string | null;
  }) => Promise<string>;
  acceptCall: (call: RingingCall) => Promise<void>;
  declineCall: (call: RingingCall) => Promise<void>;
  endCall: (callId: string, reason?: CallStatus) => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { uid, profile } = useAuth();
  const [ringing, setRinging] = useState<RingingCall[]>([]);

  const incomingCall = useMemo(
    () => ringing.find((r) => r.direction === "incoming") ?? null,
    [ringing],
  );

  // Watch incoming calls in realtime
  useEffect(() => {
    if (!uid) {
      setRinging([]);
      return;
    }

    return watchIncomingCalls(uid, (rings: RingRow[]) => {
      const incoming = rings.map((r) => ({
        id: r.id,
        kind: r.kind as "audio" | "video",
        peerId: r.peerId,
        peerName: r.peerName || "Incoming Call",
        direction: r.direction,
        chatId: r.chatId,
      }));

      setRinging((prev) => {
        const outgoings = prev.filter((p) => p.direction === "outgoing");
        return [...outgoings, ...incoming];
      });
    });
  }, [uid]);

  const startCall = useCallback(
    async (input: {
      peerId: string;
      peerName: string;
      kind: "audio" | "video";
      chatId: string | null;
    }): Promise<string> => {
      if (!uid) throw new Error("Not signed in.");
      const callId = await initiateCall(uid, input.peerId, input.kind, input.chatId);

      const outCall: RingingCall = {
        id: callId,
        kind: input.kind,
        peerId: input.peerId,
        peerName: input.peerName,
        direction: "outgoing",
        chatId: input.chatId,
      };

      setRinging((prev) => [...prev.filter((p) => p.id !== callId), outCall]);
      return callId;
    },
    [uid],
  );

  const acceptCall = useCallback(
    async (call: RingingCall) => {
      if (uid) await acceptCallDb(call.id, uid).catch(() => undefined);
      setRinging((prev) => prev.filter((r) => r.id !== call.id));
      router.push({
        pathname: "/call/[id]",
        params: {
          id: call.id,
          peerId: call.peerId,
          peerName: call.peerName,
          kind: call.kind,
        },
      });
    },
    [uid, router],
  );

  const declineCall = useCallback(
    async (call: RingingCall) => {
      if (uid) await declineCallDb(call.id, uid).catch(() => undefined);
      setRinging((prev) => prev.filter((r) => r.id !== call.id));
    },
    [uid],
  );

  const endCall = useCallback(
    async (callId: string, reason: CallStatus = "ended") => {
      await endCallDb(callId, uid ?? "", reason).catch(() => undefined);
      setRinging((prev) => prev.filter((r) => r.id !== callId));
    },
    [uid],
  );

  const value = useMemo(
    () => ({
      ringing,
      incomingCall,
      startCall,
      acceptCall,
      declineCall,
      endCall,
    }),
    [ringing, incomingCall, startCall, acceptCall, declineCall, endCall],
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCalls(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCalls must be used inside <CallProvider>");
  }
  return ctx;
}
