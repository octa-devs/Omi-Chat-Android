import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path } from "react-native-svg";
import { useTheme } from "../../providers/theme-provider";

export function Logo({
  size = 32,
  variant = "full",
  showText,
}: {
  size?: number;
  variant?: "full" | "mark" | "wordmark";
  showText?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const effectiveVariant = showText === false ? "mark" : variant;

  const markWidth = size;
  const markHeight = size;

  return (
    <View style={styles.container}>
      {variant !== "wordmark" && (
        <Svg width={markWidth} height={markHeight} viewBox="0 0 48 48" fill="none">
          <Defs>
            <SvgLinearGradient id="omi-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#60a5fa" />
              <Stop offset="50%" stopColor="#3b82f6" />
              <Stop offset="100%" stopColor="#1d4ed8" />
            </SvgLinearGradient>
            <SvgLinearGradient id="omi-grad-2" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#38bdf8" />
              <Stop offset="100%" stopColor="#2563eb" />
            </SvgLinearGradient>
          </Defs>
          {/* Omi Chat intersecting torus rings */}
          <Circle
            cx="20"
            cy="24"
            r="14"
            stroke="url(#omi-grad-1)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <Circle
            cx="28"
            cy="24"
            r="14"
            stroke="url(#omi-grad-2)"
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity={0.9}
          />
          <Path
            d="M 24 13 A 14 14 0 0 1 28 24 A 14 14 0 0 1 24 35 A 14 14 0 0 1 20 24 A 14 14 0 0 1 24 13"
            fill="url(#omi-grad-1)"
            opacity={0.35}
          />
        </Svg>
      )}

      {variant !== "mark" && (
        <View style={styles.textWrap}>
          <Text style={[styles.brandText, { color: theme.colors.text, fontSize: size * 0.62 }]}>
            Omi <Text style={{ color: theme.colors.brand }}>Chat</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  textWrap: {
    justifyContent: "center",
  },
  brandText: {
    fontWeight: "700",
    letterSpacing: -0.5,
  },
});
