import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from "react-native";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Shield,
  Maximize2,
} from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useCalls } from "@/providers/call-provider";
import { Avatar } from "@/components/ui/Avatar";
import { AuroraBackdrop } from "@/components/ui/AuroraBackdrop";

const { width, height } = Dimensions.get("window");

interface CallHubProps {
  callId: string;
  peerId: string;
  peerName: string;
  kind?: "audio" | "video";
  onEnd?: () => void;
}

export function CallHub({
  callId,
  peerId,
  peerName,
  kind = "audio",
  onEnd,
}: CallHubProps) {
  const { theme } = useTheme();
  const { endCall } = useCalls();

  const [connected, setConnected] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(kind === "audio");
  const [speakerOn, setSpeakerOn] = useState(true);

  // Simulated connection after 1.5s
  useEffect(() => {
    const t = setTimeout(() => setConnected(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Timer counter
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [connected]);

  const handleEnd = async () => {
    await endCall(callId, "ended");
    onEnd?.();
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.container}>
      <AuroraBackdrop />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.encryptionBadge}>
            <Shield size={14} color="#38bdf8" />
            <Text style={styles.encryptionText}>End-to-End Encrypted</Text>
          </View>
        </View>

        {/* Center Peer View */}
        <View style={styles.centerStage}>
          <View style={styles.avatarContainer}>
            <Avatar name={peerName} size={120} />
          </View>
          <Text style={styles.peerName} numberOfLines={1}>
            {peerName}
          </Text>
          <Text style={styles.statusText}>
            {connected ? formatTimer(seconds) : "Connecting..."}
          </Text>
        </View>

        {/* Bottom Call Controls */}
        <View style={styles.controlsBar}>
          {/* Mic Toggle */}
          <TouchableOpacity
            onPress={() => setMicMuted(!micMuted)}
            style={[
              styles.controlBtn,
              micMuted && styles.controlBtnActive,
            ]}
          >
            {micMuted ? (
              <MicOff size={24} color="#ef4444" />
            ) : (
              <Mic size={24} color="#ffffff" />
            )}
          </TouchableOpacity>

          {/* Video Toggle */}
          <TouchableOpacity
            onPress={() => setVideoOff(!videoOff)}
            style={[
              styles.controlBtn,
              videoOff && styles.controlBtnActive,
            ]}
          >
            {videoOff ? (
              <VideoOff size={24} color="#ef4444" />
            ) : (
              <Video size={24} color="#ffffff" />
            )}
          </TouchableOpacity>

          {/* Speaker Toggle */}
          <TouchableOpacity
            onPress={() => setSpeakerOn(!speakerOn)}
            style={[
              styles.controlBtn,
              !speakerOn && styles.controlBtnActive,
            ]}
          >
            {speakerOn ? (
              <Volume2 size={24} color="#ffffff" />
            ) : (
              <VolumeX size={24} color="#ef4444" />
            )}
          </TouchableOpacity>

          {/* End Call Button */}
          <TouchableOpacity
            onPress={handleEnd}
            style={[styles.controlBtn, styles.endCallBtn]}
          >
            <PhoneOff size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b101b",
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    paddingTop: 16,
  },
  encryptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  encryptionText: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "600",
  },
  centerStage: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  peerName: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
  },
  statusText: {
    color: "#94a3b8",
    fontSize: 16,
    fontWeight: "500",
  },
  controlsBar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnActive: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  endCallBtn: {
    backgroundColor: "#ef4444",
    width: 64,
    height: 64,
    borderRadius: 32,
  },
});
