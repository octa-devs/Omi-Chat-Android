"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendSignal, watchSignals } from "@/lib/supabase/calls";
import { errorMessage } from "@/lib/utils";

export type CallPhase =
  | "idle"
  | "requesting-media"
  | "ringing-out"
  | "waiting"
  | "connecting"
  | "active"
  | "reconnecting"
  | "failed"
  | "ended";

export interface CallOptions {
  callId: string | null;
  selfUid: string | null;
  peerUid: string | null;
  kind: "audio" | "video";
  /** Caller generates the offer; callee answers. Deterministic, no glare. */
  isCaller: boolean;
  onRemoteEnded?: () => void;
  onPeerState?: (state: "mic-on" | "mic-off" | "cam-on" | "cam-off") => void;
}

function iceServers(): RTCIceServer[] {
  const envUrls = (process.env.NEXT_PUBLIC_TURN_URLS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (envUrls.length) {
    return [{ urls: envUrls }];
  }
  return [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: ["stun:stun2.l.google.com:19302", "stun:stun3.l.google.com:19302"] },
    { urls: ["stun:stun4.l.google.com:19302"] },
  ];
}

function sdpPayload(desc: RTCSessionDescription | RTCSessionDescriptionInit | null) {
  if (!desc) return null;
  return { type: desc.type, sdp: desc.sdp };
}

export function useWebRTC(opts: CallOptions) {
  const {
    callId,
    selfUid,
    peerUid,
    kind,
    isCaller,
    onRemoteEnded,
    onPeerState,
  } = opts;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const makingOffer = useRef(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const [phase, setPhase] = useState<CallPhase>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(kind === "video");
  const [screenOn, setScreenOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteMuted, setRemoteMuted] = useState(false);

  const remoteEndedRef = useRef(onRemoteEnded);
  remoteEndedRef.current = onRemoteEnded;
  const peerStateRef = useRef(onPeerState);
  peerStateRef.current = onPeerState;

  /* ── teardown ─────────────────────────────────────────────── */
  const teardown = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((t) => t.stop());
    remoteRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null;
    remoteRef.current = null;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  useEffect(() => teardown, [teardown]);

  /* ── peer connection ──────────────────────────────────────── */
  const buildPc = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: iceServers() });

    pc.onicecandidate = (e) => {
      if (e.candidate && callId && selfUid && peerUid) {
        void sendSignal(callId, selfUid, peerUid, "candidate", e.candidate.toJSON());
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      remoteRef.current = stream;
      setRemoteStream(stream);
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length) {
        setRemoteMuted(audioTracks.every((t) => !t.enabled));
      }
      setPhase("active");
      setError(null);
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "connected":
          setPhase("active");
          setError(null);
          break;
        case "connecting":
        case "new":
          setPhase((p) => (p === "active" ? p : "connecting"));
          break;
        case "disconnected":
          setPhase("reconnecting");
          break;
        case "failed":
          setPhase("failed");
          setError("Connection lost. Check your network or firewall.");
          break;
        case "closed":
          break;
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setPhase("active");
        setError(null);
      } else if (pc.iceConnectionState === "failed") {
        pc.restartIce();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [callId, selfUid, peerUid]);

  /* ── media ────────────────────────────────────────────────── */
  const acquire = useCallback(async () => {
    // Re-use an existing capture — either the callee's pre-roll or a retry.
    if (localRef.current) return localRef.current;
    setPhase("requesting-media");
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: kind === "video"
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
          : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localRef.current = stream;
      setLocalStream(stream);
      setCamOn(kind === "video" && stream.getVideoTracks().length > 0);
      setMicOn(stream.getAudioTracks().some((t) => t.enabled));
      return stream;
    } catch (e) {
      const name = (e as { name?: string })?.name ?? "";
      const message =
        name === "NotAllowedError"
          ? "Microphone and camera access was blocked. Allow permissions in your browser and retry."
          : name === "NotFoundError"
            ? "No microphone or camera was found on this device."
            : name === "NotReadableError"
              ? "Your camera or microphone is already in use by another app."
              : errorMessage(e);
      setError(message);
      setPhase("failed");
      throw e;
    }
  }, [kind]);

  /* ── signalling ───────────────────────────────────────────── */
  useEffect(() => {
    if (!callId || !selfUid || !peerUid) return;
    let disposed = false;
    let retryInterval: ReturnType<typeof setInterval> | null = null;

    const pc = buildPc();
    const handled = new Set<string>();

    const flush = async () => {
      const local = localRef.current;
      if (!local) return;
      local.getTracks().forEach((t) => {
        const already = pc
          .getSenders()
          .some((s) => s.track?.kind === t.kind);
        if (!already) pc.addTrack(t, local);
      });
      if (isCaller) {
        makingOffer.current = true;
        const offer = await pc.createOffer();
        if (disposed) return;
        await pc.setLocalDescription(offer);
        await sendSignal(callId, selfUid, peerUid, "offer", sdpPayload(offer));
        makingOffer.current = false;
        setPhase("ringing-out");

        // Periodically retry sending offer in case callee subscribed after initial broadcast
        let retries = 0;
        retryInterval = setInterval(() => {
          if (disposed || !pcRef.current || pcRef.current.remoteDescription || pcRef.current.connectionState === "connected" || retries++ > 15) {
            if (retryInterval) clearInterval(retryInterval);
            return;
          }
          if (pcRef.current.localDescription && pcRef.current.signalingState === "have-local-offer") {
            void sendSignal(
              callId,
              selfUid,
              peerUid,
              "offer",
              sdpPayload(pcRef.current.localDescription),
            );
          }
        }, 2500);
      } else {
        setPhase("waiting");
        // Callee sends ping to announce ready status to caller
        void sendSignal(callId, selfUid, peerUid, "ping");
      }
    };

    void acquire()
      .then(flush)
      .catch(() => undefined);

    const unwatch = watchSignals(callId, selfUid, async (msg) => {
      if (disposed || msg.from === selfUid) return;
      if (msg.id && handled.has(msg.id)) return;
      if (msg.id) handled.add(msg.id);
      try {
        if (msg.kind === "ping") {
          // Caller re-sends offer when callee announces presence
          if (isCaller && pc.localDescription && pc.signalingState === "have-local-offer") {
            void sendSignal(
              callId,
              selfUid,
              peerUid,
              "offer",
              sdpPayload(pc.localDescription),
            );
          }
        } else if (msg.kind === "offer" && msg.payload) {
          await pc.setRemoteDescription(
            new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit),
          );
          // Drain any early ICE candidates queued before remote description
          for (const cand of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => undefined);
          }
          pendingCandidatesRef.current = [];

          await acquire().catch(() => undefined);
          localRef.current
            ?.getTracks()
            .forEach((t) => {
              if (!pc.getSenders().some((s) => s.track?.kind === t.kind)) {
                pc.addTrack(t, localRef.current as MediaStream);
              }
            });
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(callId, selfUid, peerUid, "answer", sdpPayload(answer));
          setPhase("connecting");
        } else if (msg.kind === "answer" && msg.payload) {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(
              new RTCSessionDescription(msg.payload as RTCSessionDescriptionInit),
            );
            // Drain any early ICE candidates queued before remote description
            for (const cand of pendingCandidatesRef.current) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => undefined);
            }
            pendingCandidatesRef.current = [];
            setPhase("connecting");
          }
        } else if (msg.kind === "candidate" && msg.payload) {
          const cand = msg.payload as RTCIceCandidateInit;
          if (!pc.remoteDescription) {
            pendingCandidatesRef.current.push(cand);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => undefined);
          }
        } else if (msg.kind === "hangup") {
          remoteEndedRef.current?.();
        } else if (msg.kind === "media") {
          const s = msg.payload as "mic-on" | "mic-off" | "cam-on" | "cam-off";
          peerStateRef.current?.(s);
          if (s.startsWith("mic")) setRemoteMuted(s === "mic-off");
          if (s.startsWith("cam")) {
            if (s === "cam-off") remoteRef.current?.getVideoTracks().forEach((t) => (t.enabled = false));
            else remoteRef.current?.getVideoTracks().forEach((t) => (t.enabled = true));
          }
        }
      } catch (e) {
        setError(errorMessage(e));
      }
    });

    return () => {
      disposed = true;
      if (retryInterval) clearInterval(retryInterval);
      unwatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, selfUid, peerUid, isCaller]);

  /* ── controls ─────────────────────────────────────────────── */
  const broadcast = useCallback(
    (state: "mic-on" | "mic-off" | "cam-on" | "cam-off") => {
      if (callId && selfUid && peerUid) {
        void sendSignal(callId, selfUid, peerUid, "media", state);
      }
    },
    [callId, selfUid, peerUid],
  );

  const toggleMic = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
    broadcast(next ? "mic-on" : "mic-off");
  }, [micOn, broadcast]);

  const toggleCam = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const next = !camOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
    broadcast(next ? "cam-on" : "cam-off");
  }, [camOn, broadcast]);

  // Bug #2 Fix: `toggleScreen` previously captured `screenOn` in a closure
  // stored on `screenTrack.onended`. When the user stops sharing via the OS
  // picker, the stale value caused the callback to run the wrong branch.
  // Fix: use a stable ref so `onended` always calls the current function.
  const toggleScreenRef = useRef<() => Promise<void>>(async () => undefined);

  const toggleScreen = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !callId || !selfUid || !peerUid) return;
    try {
      if (screenOn) {
        const camTrack = localRef.current
          ?.getVideoTracks()
          .find((t) => t.kind === "video");
        const sender = pc
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender && camTrack) await sender.replaceTrack(camTrack);
        setScreenOn(false);
        return;
      }
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = display.getVideoTracks()[0];
      const sender = pc
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(screenTrack);
      } else {
        pc.addTrack(screenTrack, display);
      }
      // Bug #2 Fix: use the stable ref instead of the captured closure.
      screenTrack.onended = () => void toggleScreenRef.current();
      setScreenOn(true);
    } catch {
      /* user cancelled the picker */
    }
  }, [screenOn, callId, selfUid, peerUid]);

  // Keep the ref up to date whenever the callback identity changes.
  toggleScreenRef.current = toggleScreen;

  const hangup = useCallback(async () => {
    if (callId && selfUid && peerUid) {
      await sendSignal(callId, selfUid, peerUid, "hangup").catch(() => undefined);
    }
    setPhase("ended");
    teardown();
  }, [callId, selfUid, peerUid, teardown]);

  /* Keep the call alive if the tab sleeps mid-negotiation. */
  useEffect(() => {
    if (!pcRef.current || phase !== "reconnecting") return;
    const t = setInterval(() => {
      if (pcRef.current?.restartIce) pcRef.current.restartIce();
    }, 4000);
    return () => clearInterval(t);
  }, [phase]);

  return {
    phase,
    error,
    micOn,
    camOn,
    screenOn,
    remoteMuted,
    localStream,
    remoteStream,
    isCaller,
    makingOffer: makingOffer.current,
    toggleMic,
    toggleCam,
    toggleScreen,
    hangup,
    teardown,
    setPhase,
  };
}