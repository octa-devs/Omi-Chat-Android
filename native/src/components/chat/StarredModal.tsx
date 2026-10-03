import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Star, Sparkles, MessageSquare } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { Modal } from "@/components/ui/Modal";
import { getStarred, toggleStar, StarredEntry } from "@/hooks/use-chat-data";

interface StarredModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectStarredMessage?: (chatId: string, messageId: string) => void;
}

export function StarredModal({
  visible,
  onClose,
  onSelectStarredMessage,
}: StarredModalProps) {
  const { theme } = useTheme();
  const [starredList, setStarredList] = useState<StarredEntry[]>([]);

  useEffect(() => {
    if (visible) {
      getStarred().then(setStarredList);
    }
  }, [visible]);

  const handleUnstar = async (entry: StarredEntry) => {
    await toggleStar(entry);
    const updated = await getStarred();
    setStarredList(updated);
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Starred Messages">
      <View style={styles.container}>
        {starredList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Star size={36} color={theme.colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
              No Starred Messages
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.mutedForeground }]}>
              Long press any message in a conversation to star it for easy reference later.
            </Text>
          </View>
        ) : (
          <FlatList
            data={starredList}
            keyExtractor={(item) => item.messageId}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onSelectStarredMessage?.(item.chatId, item.messageId);
                }}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.headerRow}>
                  <View style={styles.chatBadge}>
                    <MessageSquare size={13} color={theme.colors.primary} />
                    <Text style={[styles.chatTitle, { color: theme.colors.primary }]}>
                      {item.chatTitle}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleUnstar(item)}
                    style={styles.unstarBtn}
                  >
                    <Star
                      size={16}
                      color={theme.colors.accent}
                      fill={theme.colors.accent}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sender, { color: theme.colors.mutedForeground }]}>
                  {item.senderName}
                </Text>
                <Text
                  style={[styles.messageText, { color: theme.colors.foreground }]}
                  numberOfLines={3}
                >
                  {item.text || `[${item.kind}]`}
                </Text>
                <Text style={[styles.dateText, { color: theme.colors.mutedForeground }]}>
                  {new Date(item.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  chatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chatTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  unstarBtn: {
    padding: 4,
  },
  sender: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
