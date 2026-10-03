import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from "react-native";
import {
  Search,
  Pin,
  VolumeX,
  Users,
  Check,
  CheckCheck,
  Edit3,
  Clock,
  Sparkles,
} from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { useSettings } from "@/providers/settings-provider";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { previewOf, filterChats } from "@/hooks/use-chat-data";
import type { OmiChat } from "@/lib/types";

interface ChatListProps {
  chats: OmiChat[];
  loading?: boolean;
  onSelectChat: (chat: OmiChat) => void;
  activeChatId?: string | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

type FilterTab = "all" | "unread" | "direct" | "groups";

export function ChatList({
  chats,
  loading,
  onSelectChat,
  activeChatId,
  onRefresh,
  refreshing = false,
}: ChatListProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isPinned, isMuted } = useSettings();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered = useMemo(() => {
    let result = filterChats(chats, search);

    if (activeTab === "unread") {
      result = result.filter((c) => (c.unreadCount ?? 0) > 0);
    } else if (activeTab === "direct") {
      result = result.filter((c) => c.kind === "direct");
    } else if (activeTab === "groups") {
      result = result.filter((c) => c.kind === "group");
    }

    return result;
  }, [chats, search, activeTab]);

  const renderItem = ({ item }: { item: OmiChat }) => {
    const isSelected = activeChatId === item.id;
    const pinned = isPinned(item.id);
    const muted = isMuted(item.id);
    const unread = item.unreadCount ?? 0;
    const preview = previewOf(item, user?.id ?? null);
    const timeFormatted = item.lastMessage
      ? formatTime(item.lastMessage.createdAt)
      : formatTime(item.createdAt);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onSelectChat(item)}
        style={[
          styles.chatItem,
          {
            backgroundColor: isSelected
              ? theme.colors.surfaceElevated
              : "transparent",
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <Avatar
          src={item.avatarUrl}
          name={item.title}
          size={50}
          isOnline={item.isOnline}
        />

        <View style={styles.chatInfo}>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.title,
                { color: theme.colors.foreground },
                unread > 0 && styles.titleUnread,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.time,
                { color: unread > 0 ? theme.colors.primary : theme.colors.mutedForeground },
              ]}
            >
              {timeFormatted}
            </Text>
          </View>

          <View style={styles.previewRow}>
            <Text
              style={[
                styles.preview,
                {
                  color: unread > 0
                    ? theme.colors.foreground
                    : theme.colors.mutedForeground,
                  fontWeight: unread > 0 ? "600" : "400",
                },
              ]}
              numberOfLines={1}
            >
              {preview}
            </Text>

            <View style={styles.badgeRow}>
              {pinned && (
                <Pin
                  size={14}
                  color={theme.colors.mutedForeground}
                  style={{ transform: [{ rotate: "45deg" }], marginRight: 4 }}
                />
              )}
              {muted && (
                <VolumeX
                  size={14}
                  color={theme.colors.mutedForeground}
                  style={{ marginRight: 4 }}
                />
              )}
              {unread > 0 && (
                <View
                  style={[
                    styles.unreadBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={styles.unreadCount}>
                    {unread > 99 ? "99+" : unread}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Search size={18} color={theme.colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations..."
            placeholderTextColor={theme.colors.mutedForeground}
            style={[styles.searchInput, { color: theme.colors.foreground }]}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: theme.colors.border }]}>
        {(["all", "unread", "direct", "groups"] as FilterTab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabBtn,
                isActive && {
                  backgroundColor: theme.colors.primary + "1A",
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? theme.colors.primary : theme.colors.mutedForeground,
                    fontWeight: isActive ? "600" : "500",
                  },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chat List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <Skeleton width={50} height={50} radius={25} />
              <View style={styles.skeletonTextCol}>
                <Skeleton width="60%" height={16} radius={4} style={{ marginBottom: 6 }} />
                <Skeleton width="85%" height={12} radius={4} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
              />
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Sparkles size={40} color={theme.colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
                {search ? "No chats found" : "No conversations yet"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.mutedForeground }]}>
                {search
                  ? "Try searching for another contact or keyword"
                  : "Tap the compose button below to start chatting!"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const diffDays = Math.round((now.getTime() - ts) / (1000 * 3600 * 24));
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabText: {
    fontSize: 13,
  },
  chatItem: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  titleUnread: {
    fontWeight: "700",
  },
  time: {
    fontSize: 12,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  preview: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  skeletonTextCol: {
    flex: 1,
    marginLeft: 14,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
