import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../providers/theme-provider";

export function Skeleton({
  style,
  borderRadius = 10,
  width,
  height,
  radius,
}: {
  style?: ViewStyle;
  borderRadius?: number;
  width?: number | string;
  height?: number | string;
  radius?: number;
}) {
  const { theme, isDark } = useTheme();
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: isDark
            ? "rgba(255, 255, 255, 0.12)"
            : "rgba(0, 0, 0, 0.08)",
          borderRadius: radius ?? borderRadius,
          width: width as any,
          height: height as any,
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

export function SkeletonChatRow() {
  return (
    <View style={styles.chatRow}>
      <Skeleton style={{ width: 48, height: 48, borderRadius: 24 }} />
      <View style={styles.chatRowInfo}>
        <View style={styles.chatRowTop}>
          <Skeleton style={{ width: 120, height: 14, borderRadius: 6 }} />
          <Skeleton style={{ width: 36, height: 10, borderRadius: 4 }} />
        </View>
        <Skeleton style={{ width: "80%", height: 12, borderRadius: 6, marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonBubble({ own }: { own?: boolean }) {
  return (
    <View style={[styles.bubbleRow, own && styles.bubbleRowOwn]}>
      <Skeleton
        style={{
          width: own ? "65%" : "70%",
          height: 48,
          borderRadius: 20,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  chatRowInfo: {
    flex: 1,
  },
  chatRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bubbleRow: {
    paddingHorizontal: 16,
    marginVertical: 4,
    flexDirection: "row",
  },
  bubbleRowOwn: {
    justifyContent: "flex-end",
  },
});
