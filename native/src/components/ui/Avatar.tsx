import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../providers/theme-provider";
import type { PresenceState } from "../../lib/types";

const SIZES = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 54,
  xl: 66,
  "2xl": 88,
} as const;

const FONT_SIZES = {
  xs: 11,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
} as const;

const GRADIENTS: [string, string][] = [
  ["#3b82f6", "#1d4ed8"],
  ["#10b981", "#047857"],
  ["#f59e0b", "#b45309"],
  ["#8b5cf6", "#6d28d9"],
  ["#ec4899", "#be185d"],
  ["#06b6d4", "#0e7490"],
  ["#f97316", "#c2410c"],
];

function getGradient(id?: string, name?: string): [string, string] {
  const key = id || name || "omi";
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[idx];
}

function getInitials(name?: string): string {
  if (!name) return "O";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  id,
  name,
  src,
  size = "md",
  presence,
  isOnline,
  ring,
}: {
  id?: string;
  name?: string;
  src?: string | null;
  size?: keyof typeof SIZES | number;
  presence?: PresenceState;
  isOnline?: boolean;
  ring?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const dimension = typeof size === "number" ? size : (SIZES[size] || SIZES.md);
  const fontSize = typeof size === "number" ? Math.max(10, Math.round(size * 0.38)) : (FONT_SIZES[size] || FONT_SIZES.md);
  const gradient = getGradient(id, name);
  const initials = getInitials(name);

  const effectivePresence = isOnline !== undefined ? (isOnline ? "online" : "offline") : presence;
  const dotSize = Math.max(8, Math.round(dimension * 0.28));
  const presenceColor =
    effectivePresence === "online"
      ? theme.colors.success
      : effectivePresence === "busy"
        ? theme.colors.danger
        : effectivePresence === "away"
          ? "#f59e0b"
          : isDark
            ? "#475569"
            : "#94a3b8";

  return (
    <View style={{ width: dimension, height: dimension, position: "relative" }}>
      <View
        style={[
          styles.container,
          {
            width: dimension,
            height: dimension,
            borderRadius: dimension / 2,
            borderWidth: ring ? 2 : 0,
            borderColor: theme.colors.brandBorder,
          },
        ]}
      >
        {src ? (
          <Image
            source={{ uri: src }}
            style={{ width: "100%", height: "100%", borderRadius: dimension / 2 }}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { borderRadius: dimension / 2 }]}
          >
            <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
          </LinearGradient>
        )}
      </View>

      {presence && (
        <View
          style={[
            styles.presenceDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: presenceColor,
              borderColor: isDark ? theme.colors.surface : theme.palette.ink900,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  gradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#ffffff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  presenceDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    borderWidth: 2,
  },
});
