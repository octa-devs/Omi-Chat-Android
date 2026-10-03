import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CallHub } from "@/components/call/CallHub";

export default function CallScreen() {
  const router = useRouter();
  const { id, peerId, peerName, kind } = useLocalSearchParams<{
    id: string;
    peerId: string;
    peerName: string;
    kind: "audio" | "video";
  }>();

  const callId = Array.isArray(id) ? id[0] : id;
  const targetPeerId = Array.isArray(peerId) ? peerId[0] : peerId || "";
  const targetPeerName = Array.isArray(peerName) ? peerName[0] : peerName || "Call";
  const callKind = Array.isArray(kind) ? kind[0] : kind || "audio";

  return (
    <CallHub
      callId={callId || ""}
      peerId={targetPeerId}
      peerName={targetPeerName}
      kind={callKind as "audio" | "video"}
      onEnd={() => router.back()}
    />
  );
}
