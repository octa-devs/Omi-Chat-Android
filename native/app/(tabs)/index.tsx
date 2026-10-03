import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Plus, Star, Sparkles } from "lucide-react-native";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useInbox } from "@/hooks/use-chat-data";
import { ChatList } from "@/components/chat/ChatList";
import { NewChatModal } from "@/components/chat/NewChatModal";
import { StarredModal } from "@/components/chat/StarredModal";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import type { OmiChat } from "@/lib/types";

export default function ChatsTab() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();

  const { chats, loading } = useInbox(user?.id ?? null);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);
  const [starredModalOpen, setStarredModalOpen] = useState(false);

  const handleSelectChat = (chat: OmiChat) => {
    router.push({
      pathname: "/chat/[id]",
      params: { id: chat.id, title: chat.title, kind: chat.kind },
    });
  };

  const handleChatCreated = (chatId: string) => {
    router.push({
      pathname: "/chat/[id]",
      params: { id: chatId },
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* App Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Logo size={32} showText={false} />
          <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>
            Omi Chat
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setStarredModalOpen(true)}
            style={[styles.iconBtn, { backgroundColor: theme.colors.muted }]}
          >
            <Star size={18} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/settings")}
            style={styles.avatarBtn}
          >
            <Avatar
              src={user?.avatarUrl}
              name={user?.displayName || "Me"}
              size={36}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Inbox Stream */}
      <ChatList
        chats={chats}
        loading={loading}
        onSelectChat={handleSelectChat}
      />

      {/* Floating Action Button (New Chat) */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setNewChatModalOpen(true)}
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
          },
        ]}
      >
        <Plus size={26} color="#ffffff" />
      </TouchableOpacity>

      {/* Modals */}
      <NewChatModal
        visible={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        onChatCreated={handleChatCreated}
      />

      <StarredModal
        visible={starredModalOpen}
        onClose={() => setStarredModalOpen(false)}
        onSelectStarredMessage={(chatId) => {
          router.push({
            pathname: "/chat/[id]",
            params: { id: chatId },
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBtn: {
    marginLeft: 2,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});
