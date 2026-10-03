import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Eye, EyeOff, CircleAlert, Check } from "lucide-react-native";
import { useTheme } from "../../providers/theme-provider";

export interface FieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  success?: boolean;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  invalid?: boolean;
  containerStyle?: ViewStyle;
  style?: ViewStyle;
}

export function Field({
  label,
  hint,
  error,
  success,
  children,
  icon,
  invalid,
  containerStyle,
  style,
  ...inputProps
}: FieldProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.fieldWrap, style]}>
      {label && (
        <View style={styles.labelRow}>
          <Text
            style={[
              styles.labelText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {label}
          </Text>
          {hint && (
            <Text style={[styles.hintText, { color: theme.colors.textMuted }]}>
              {hint}
            </Text>
          )}
        </View>
      )}

      {children ? (
        children
      ) : (
        <Input
          icon={icon}
          invalid={Boolean(invalid || error)}
          containerStyle={containerStyle}
          {...inputProps}
        />
      )}

      {error ? (
        <View style={styles.feedbackRow}>
          <CircleAlert size={14} color={theme.colors.danger} />
          <Text style={[styles.errorText, { color: theme.colors.danger }]}>
            {error}
          </Text>
        </View>
      ) : success ? (
        <View style={styles.feedbackRow}>
          <Check size={14} color={theme.colors.success} />
          <Text style={[styles.successText, { color: theme.colors.success }]}>
            Looks good
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
  invalid?: boolean;
  containerStyle?: ViewStyle;
}

export function Input({
  icon,
  invalid,
  secureTextEntry,
  containerStyle,
  style,
  placeholderTextColor,
  ...props
}: InputProps) {
  const { theme, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);

  const isPassword = Boolean(secureTextEntry);
  const isHidden = isPassword && !reveal;

  const borderColor = invalid
    ? theme.colors.danger
    : focused
      ? theme.colors.brand
      : isDark
        ? "rgba(255, 255, 255, 0.12)"
        : theme.colors.border;

  const bgColor = isDark
    ? focused
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(255, 255, 255, 0.04)"
    : focused
      ? "#ffffff"
      : theme.colors.surface;

  return (
    <View
      style={[
        styles.inputContainer,
        {
          borderColor,
          backgroundColor: bgColor,
          borderRadius: theme.radius.xl,
        },
        containerStyle,
      ]}
    >
      {icon && <View style={styles.iconSlot}>{icon}</View>}

      <TextInput
        placeholderTextColor={
          placeholderTextColor || (isDark ? "#64748b" : "#94a3b8")
        }
        secureTextEntry={isHidden}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.textInput,
          {
            color: theme.colors.text,
            paddingLeft: icon ? 0 : 16,
            paddingRight: isPassword ? 44 : 16,
          },
          style,
        ]}
        {...props}
      />

      {isPassword && (
        <TouchableOpacity
          onPress={() => setReveal((v) => !v)}
          style={styles.eyeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {reveal ? (
            <EyeOff size={18} color={theme.colors.textMuted} />
          ) : (
            <Eye size={18} color={theme.colors.textMuted} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export function Textarea({
  containerStyle,
  style,
  invalid,
  rows = 4,
  ...props
}: InputProps & { rows?: number }) {
  const { theme, isDark } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = invalid
    ? theme.colors.danger
    : focused
      ? theme.colors.brand
      : isDark
        ? "rgba(255, 255, 255, 0.12)"
        : theme.colors.border;

  const bgColor = isDark
    ? focused
      ? "rgba(255, 255, 255, 0.08)"
      : "rgba(255, 255, 255, 0.04)"
    : focused
      ? "#ffffff"
      : theme.colors.surface;

  return (
    <View
      style={[
        styles.textareaContainer,
        {
          borderColor,
          backgroundColor: bgColor,
          borderRadius: theme.radius.xl,
          minHeight: rows * 26 + 24,
        },
        containerStyle,
      ]}
    >
      <TextInput
        multiline
        textAlignVertical="top"
        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.textareaInput,
          {
            color: theme.colors.text,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  labelText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  hintText: {
    fontSize: 12,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "500",
  },
  successText: {
    fontSize: 12,
    fontWeight: "500",
  },
  inputContainer: {
    height: 50,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  iconSlot: {
    paddingLeft: 14,
    paddingRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  textareaContainer: {
    borderWidth: 1.5,
    padding: 12,
  },
  textareaInput: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
});
