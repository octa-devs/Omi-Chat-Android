import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { Send, Check } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { sendMessage } from "@/lib/supabase/chats";
import type { OmiChat, OmiMessage } from "@/lib/types";

interface ForwardModalProps {
  visible: boolean;
  message: OmiMessage | null;
  chats: OmiChat[];
  onClose: () => void;
  onForwarded?: (targetChatId: string) => void;
}

export function ForwardModal({
  visible,
  message,
  chats,
  onClose,
  onForwarded,
}: ForwardModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [forwarding, setForwarding] = useState<string | null>(null);

  if (!message) return null;

  const handleForwardTo = async (chat: OmiChat) => {
    if (!user) return;
    setForwarding(chat.id);
    try {
      await sendMessage({
        chat,
        senderId: user.id,
        senderName: user.displayName || user.username || "Me",
        text: `[Forwarded] ${message.text || ""}`,
        kind: message.kind,
        attachmentUrl: message.mediaUrl,
        attachmentName: message.mediaName,
        attachmentSize: message.mediaSize,
      });

      onClose();
      onForwarded?.(chat.id);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to forward message");
    } finally {
      setForwarding(null);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Forward Message">
      <View style={styles.container}>
        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text style={[styles.previewLabel, { color: theme.colors.mutedForeground }]}>
            Forwarding message:
          </Text>
          <Text
            style={[styles.previewContent, { color: theme.colors.foreground }]}
            numberOfLines={2}
          >
            {message.text || `[${message.kind}]`}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground }]}>
          SELECT CHAT
        </Text>

        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 300 }}
          renderItem={({ item }) => {
            const isTarget = forwarding === item.id;
            return (
              <TouchableOpacity
                onPress={() => handleForwardTo(item)}
                disabled={Boolean(forwarding)}
                style={[
                  styles.chatRow,
                  { borderBottomColor: theme.colors.border },
                ]}
              >
                <Avatar src={item.avatarUrl} name={item.title} size={42} />
                <View style={styles.chatInfo}>
                  <Text
                    style={[styles.chatTitle, { color: theme.colors.foreground }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.chatKind, { color: theme.colors.mutedForeground }]}
                  >
                    {item.kind === "group" ? "Group" : "Direct"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor: isTarget
                        ? theme.colors.primary
                        : theme.colors.primary + "1A",
                    },
                  ]}
                >
                  <Send
                    size={16}
                    color={isTarget ? "#ffffff" : theme.colors.primary}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  previewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
  },
  previewContent: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  chatKind: {
    fontSize: 12,
    marginTop: 1,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
