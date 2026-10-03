import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Phone, PhoneOff, Video } from "lucide-react-native";
import { useCalls } from "@/providers/call-provider";
import { Avatar } from "@/components/ui/Avatar";

const { width, height } = Dimensions.get("window");

export function IncomingCallOverlay() {
  const { incomingCall, acceptCall, declineCall } = useCalls();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!incomingCall) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [incomingCall, pulseAnim]);

  if (!incomingCall) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        {/* Caller Info */}
        <Animated.View
          style={[
            styles.avatarWrap,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Avatar name={incomingCall.peerName} size={110} />
        </Animated.View>

        <Text style={styles.callerName} numberOfLines={1}>
          {incomingCall.peerName}
        </Text>

        <Text style={styles.callType}>
          Incoming {incomingCall.kind === "video" ? "Video" : "Audio"} Call...
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {/* Decline Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => declineCall(incomingCall)}
            style={[styles.btn, styles.declineBtn]}
          >
            <PhoneOff size={30} color="#ffffff" />
            <Text style={styles.btnLabel}>Decline</Text>
          </TouchableOpacity>

          {/* Accept Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => acceptCall(incomingCall)}
            style={[styles.btn, styles.acceptBtn]}
          >
            {incomingCall.kind === "video" ? (
              <Video size={30} color="#ffffff" />
            ) : (
              <Phone size={30} color="#ffffff" />
            )}
            <Text style={styles.btnLabel}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width,
    height,
    backgroundColor: "rgba(10, 15, 29, 0.95)",
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 32,
  },
  avatarWrap: {
    marginBottom: 24,
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  callerName: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  callType: {
    color: "#94a3b8",
    fontSize: 16,
    marginBottom: 60,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    maxWidth: 320,
  },
  btn: {
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ef4444",
  },
  acceptBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#22c55e",
  },
  btnLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
});
