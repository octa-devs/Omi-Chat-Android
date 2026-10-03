import React from "react";
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "../../providers/theme-provider";

export interface ModalProps {
  open?: boolean;
  visible?: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({
  open,
  visible,
  onClose,
  title,
  description,
  children,
  footer,
}: ModalProps) {
  const { theme, isDark } = useTheme();
  const isOpen = visible ?? open ?? false;

  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.scrim}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.avoidingWrap}
          >
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: isDark
                      ? theme.palette.ink900
                      : theme.palette.ink900,
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.12)"
                      : theme.colors.border,
                    borderRadius: theme.radius["3xl"],
                  },
                ]}
              >
                {(title || description) && (
                  <View
                    style={[
                      styles.header,
                      {
                        borderBottomColor: isDark
                          ? "rgba(255, 255, 255, 0.08)"
                          : theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.titleWrap}>
                      {typeof title === "string" ? (
                        <Text
                          style={[styles.title, { color: theme.colors.text }]}
                        >
                          {title}
                        </Text>
                      ) : (
                        title
                      )}
                      {description && (
                        <Text
                          style={[
                            styles.description,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {description}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <X size={20} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}

                <ScrollView
                  style={styles.body}
                  contentContainerStyle={styles.bodyContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>

                {footer && (
                  <View
                    style={[
                      styles.footer,
                      {
                        borderTopColor: isDark
                          ? "rgba(255, 255, 255, 0.08)"
                          : theme.colors.border,
                        backgroundColor: isDark
                          ? "rgba(255, 255, 255, 0.02)"
                          : "rgba(0, 0, 0, 0.02)",
                      },
                    ]}
                  >
                    {footer}
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  avoidingWrap: {
    width: "100%",
    maxWidth: 440,
  },
  card: {
    width: "100%",
    maxHeight: "85%",
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    padding: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
});
