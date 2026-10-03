import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../../providers/theme-provider";

export interface SwitchProps {
  checked?: boolean;
  value?: boolean;
  onChange?: (v: boolean) => void;
  onValueChange?: (v: boolean) => void;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Switch({
  checked,
  value,
  onChange,
  onValueChange,
  label,
  description,
  icon,
  disabled,
  style,
}: SwitchProps) {
  const { theme, isDark } = useTheme();
  const isChecked = Boolean(value ?? checked ?? false);
  const anim = useRef(new Animated.Value(isChecked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isChecked ? 1 : 0,
      stiffness: 500,
      damping: 32,
      useNativeDriver: false,
    }).start();
  }, [isChecked, anim]);

  const toggle = () => {
    if (!disabled) {
      onChange?.(!isChecked);
      onValueChange?.(!isChecked);
    }
  };

  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isDark ? "#334155" : "#cbd5e1",
      theme.colors.brand,
    ],
  });

  const knobLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={toggle}
      disabled={disabled}
      style={[styles.row, { opacity: disabled ? 0.45 : 1 }, style]}
    >
      <View style={styles.leftContent}>
        {icon && (
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: checked
                  ? theme.colors.brandSoft
                  : isDark
                    ? "rgba(255, 255, 255, 0.06)"
                    : "#f1f5f9",
              },
            ]}
          >
            {icon}
          </View>
        )}
        <View style={styles.textWrap}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            {label}
          </Text>
          {description && (
            <Text
              style={[styles.description, { color: theme.colors.textMuted }]}
            >
              {description}
            </Text>
          )}
        </View>
      </View>

      <Animated.View style={[styles.track, { backgroundColor: trackBg }]}>
        <Animated.View style={[styles.knob, { left: knobLeft }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    gap: 12,
  },
  leftContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  description: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});
