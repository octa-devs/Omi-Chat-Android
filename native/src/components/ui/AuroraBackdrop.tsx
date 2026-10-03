import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../providers/theme-provider";

export function AuroraBackdrop({ children }: { children?: React.ReactNode }) {
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Soft ambient gradient spots */}
      <View style={styles.glowTop}>
        <LinearGradient
          colors={
            isDark
              ? ["rgba(59, 130, 246, 0.15)", "transparent"]
              : ["rgba(185, 209, 251, 0.4)", "transparent"]
          }
          style={styles.gradientOrb}
        />
      </View>

      <View style={styles.glowBottom}>
        <LinearGradient
          colors={
            isDark
              ? ["rgba(37, 99, 235, 0.12)", "transparent"]
              : ["rgba(54, 112, 221, 0.15)", "transparent"]
          }
          style={styles.gradientOrb}
        />
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  glowTop: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 320,
    height: 320,
    borderRadius: 160,
    overflow: "hidden",
  },
  glowBottom: {
    position: "absolute",
    bottom: -100,
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    overflow: "hidden",
  },
  gradientOrb: {
    width: "100%",
    height: "100%",
  },
});
