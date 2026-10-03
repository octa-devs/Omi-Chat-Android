import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../providers/theme-provider";

export type ButtonVariant = "primary" | "secondary" | "glass" | "outline" | "ghost" | "danger" | "gold";
export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

export interface ButtonProps {
  onPress?: () => void;
  children?: React.ReactNode;
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  block?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  onPress,
  children,
  title,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  block = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const { theme, isDark } = useTheme();

  const isBlock = block || fullWidth;
  const label = title ?? (typeof children === "string" ? children : undefined);
  const isIconOnly = size === "icon" || size === "icon-sm";
  const height = size === "sm" ? 38 : size === "lg" ? 54 : size === "icon-sm" ? 36 : size === "icon" ? 44 : 48;
  const paddingHorizontal = isIconOnly ? 0 : size === "sm" ? 14 : size === "lg" ? 24 : 18;
  const width = isIconOnly ? height : isBlock ? "100%" : undefined;

  const getVariantStyles = (): {
    bg?: string;
    gradient?: [string, string];
    border?: string;
    textColor: string;
  } => {
    switch (variant) {
      case "primary":
        return {
          gradient: isDark
            ? ["#3b82f6", "#1d4ed8"]
            : ["#3670dd", "#1c4492"],
          textColor: "#ffffff",
        };
      case "gold":
        return {
          gradient: ["#eaa14a", "#c07c1f"],
          textColor: "#ffffff",
        };
      case "danger":
        return {
          gradient: ["#f4617a", "#c21e3c"],
          textColor: "#ffffff",
        };
      case "secondary":
        return {
          bg: theme.colors.surfaceSunk,
          border: theme.colors.border,
          textColor: theme.colors.text,
        };
      case "glass":
        return {
          bg: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.75)",
          border: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
          textColor: theme.colors.text,
        };
      case "outline":
        return {
          bg: "transparent",
          border: theme.colors.border,
          textColor: theme.colors.text,
        };
      case "ghost":
        return {
          bg: "transparent",
          textColor: theme.colors.textSecondary,
        };
      default:
        return {
          bg: theme.colors.brand,
          textColor: "#ffffff",
        };
    }
  };

  const vStyle = getVariantStyles();

  const content = (
    <View style={styles.contentRow}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={vStyle.textColor}
          style={{ marginRight: label ? 8 : 0 }}
        />
      ) : icon ? (
        <View style={{ marginRight: label ? 8 : 0 }}>{icon}</View>
      ) : null}

      {label ? (
        <Text
          style={[
            styles.text,
            {
              color: vStyle.textColor,
              fontSize: size === "sm" ? 13 : size === "lg" ? 16 : 14,
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
      ) : (
        children
      )}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.78}
      style={[
        styles.base,
        {
          height,
          paddingHorizontal,
          width,
          borderRadius: height / 2,
          opacity: disabled ? 0.45 : 1,
          borderColor: vStyle.border,
          borderWidth: vStyle.border ? 1 : 0,
          backgroundColor: vStyle.bg,
        },
        style,
      ]}
    >
      {vStyle.gradient ? (
        <LinearGradient
          colors={vStyle.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: height / 2, alignItems: "center", justifyContent: "center" },
          ]}
        >
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
