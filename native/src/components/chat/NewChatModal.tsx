import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  User,
  Users,
  Search,
  Check,
  X,
  Plus,
} from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { searchUsers } from "@/lib/supabase/users";
import { getOrCreateDirectChat, createGroupChat } from "@/lib/supabase/chats";
import type { OmiUser } from "@/lib/types";

interface NewChatModalProps {
  visible: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

export function NewChatModal({
  visible,
  onClose,
  onChatCreated,
}: NewChatModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<OmiUser[]>([]);
  const [searching, setSearching] = useState(false);

  // Group creation state
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<OmiUser[]>([]);
  const [creating, setCreating] = useState(false);

  // Search effect with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const list = await searchUsers(searchQuery.trim(), 15);
        // Exclude current user
        setResults(list.filter((u) => u.uid !== user?.id));
      } catch (err) {
        console.error("Failed to search users", err);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  const reset = () => {
    setMode("direct");
    setSearchQuery("");
    setResults([]);
    setGroupTitle("");
    setSelectedMembers([]);
    setCreating(false);
  };

  const handleSelectDirectUser = async (targetUser: OmiUser) => {
    if (!user) return;
    setCreating(true);
    try {
      const chatId = await getOrCreateDirectChat(
        {
          uid: user.id,
          displayName: user.displayName || user.username || "Anonymous",
          avatarUrl: user.avatarUrl,
        },
        {
          uid: targetUser.uid,
          displayName: targetUser.displayName || targetUser.username || "User",
          username: targetUser.username,
          avatarUrl: targetUser.avatarUrl,
        },
      );
      reset();
      onClose();
      onChatCreated(chatId);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to start conversation");
    } finally {
      setCreating(false);
    }
  };

  const toggleGroupMember = (targetUser: OmiUser) => {
    if (selectedMembers.some((m) => m.uid === targetUser.uid)) {
      setSelectedMembers((prev) => prev.filter((m) => m.uid !== targetUser.uid));
    } else {
      setSelectedMembers((prev) => [...prev, targetUser]);
    }
  };

  const handleCreateGroup = async () => {
    if (!user) return;
    if (!groupTitle.trim()) {
      Alert.alert("Group Name Required", "Please enter a name for the group.");
      return;
    }
    if (selectedMembers.length === 0) {
      Alert.alert("Members Required", "Please select at least one contact for the group.");
      return;
    }

    setCreating(true);
    try {
      const chatId = await createGroupChat({
        me: {
          uid: user.id,
          displayName: user.displayName || user.username || "Me",
        },
        title: groupTitle.trim(),
        members: selectedMembers.map((m) => ({
          uid: m.uid,
          displayName: m.displayName || m.username || "Member",
        })),
      });

      reset();
      onClose();
      onChatCreated(chatId);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title={mode === "direct" ? "New Conversation" : "Create Group"}
    >
      {/* Mode Switcher */}
      <View style={[styles.modeTabs, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => setMode("direct")}
          style={[
            styles.modeTab,
            mode === "direct" && {
              borderBottomColor: theme.colors.primary,
              borderBottomWidth: 2,
            },
          ]}
        >
          <User
            size={18}
            color={mode === "direct" ? theme.colors.primary : theme.colors.mutedForeground}
          />
          <Text
            style={[
              styles.modeTabText,
              {
                color:
                  mode === "direct" ? theme.colors.primary : theme.colors.mutedForeground,
                fontWeight: mode === "direct" ? "700" : "500",
              },
            ]}
          >
            Direct Message
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode("group")}
          style={[
            styles.modeTab,
            mode === "group" && {
              borderBottomColor: theme.colors.primary,
              borderBottomWidth: 2,
            },
          ]}
        >
          <Users
            size={18}
            color={mode === "group" ? theme.colors.primary : theme.colors.mutedForeground}
          />
          <Text
            style={[
              styles.modeTabText,
              {
                color:
                  mode === "group" ? theme.colors.primary : theme.colors.mutedForeground,
                fontWeight: mode === "group" ? "700" : "500",
              },
            ]}
          >
            New Group
          </Text>
        </TouchableOpacity>
      </View>

      {/* Group Title Field if in group mode */}
      {mode === "group" && (
        <View style={styles.groupMetaSection}>
          <Field
            label="Group Name"
            placeholder="e.g. Project Alpha, Family..."
            value={groupTitle}
            onChangeText={setGroupTitle}
          />

          {selectedMembers.length > 0 && (
            <View style={styles.chipsContainer}>
              <Text style={[styles.chipHeader, { color: theme.colors.mutedForeground }]}>
                Selected ({selectedMembers.length}):
              </Text>
              <View style={styles.chipsWrap}>
                {selectedMembers.map((m) => (
                  <TouchableOpacity
                    key={m.uid}
                    onPress={() => toggleGroupMember(m)}
                    style={[
                      styles.chip,
                      { backgroundColor: theme.colors.primary + "20", borderColor: theme.colors.primary },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: theme.colors.foreground }]}>
                      {m.displayName || m.username}
                    </Text>
                    <X size={14} color={theme.colors.mutedForeground} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <Field
          placeholder="Search by name or @username..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Results List */}
      <View style={styles.resultsContainer}>
        {searching ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color={theme.colors.primary} size="small" />
            <Text style={[styles.statusText, { color: theme.colors.mutedForeground }]}>
              Searching contacts...
            </Text>
          </View>
        ) : searchQuery.trim().length >= 2 && results.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.statusText, { color: theme.colors.mutedForeground }]}>
              No users found matching &quot;{searchQuery}&quot;
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.uid}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 220 }}
            renderItem={({ item }) => {
              const isSelected = selectedMembers.some((m) => m.uid === item.uid);
              return (
                <TouchableOpacity
                  onPress={() => {
                    if (mode === "direct") {
                      handleSelectDirectUser(item);
                    } else {
                      toggleGroupMember(item);
                    }
                  }}
                  style={[
                    styles.userRow,
                    { borderBottomColor: theme.colors.border },
                  ]}
                >
                  <Avatar
                    src={item.avatarUrl}
                    name={item.displayName || item.username || "User"}
                    size={40}
                  />
                  <View style={styles.userMeta}>
                    <Text
                      style={[styles.userName, { color: theme.colors.foreground }]}
                      numberOfLines={1}
                    >
                      {item.displayName || item.username}
                    </Text>
                    {item.username && (
                      <Text
                        style={[styles.userHandle, { color: theme.colors.mutedForeground }]}
                      >
                        @{item.username}
                      </Text>
                    )}
                  </View>

                  {mode === "group" ? (
                    <View
                      style={[
                        styles.checkCircle,
                        {
                          borderColor: isSelected
                            ? theme.colors.primary
                            : theme.colors.border,
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : "transparent",
                        },
                      ]}
                    >
                      {isSelected && <Check size={14} color="#ffffff" />}
                    </View>
                  ) : (
                    <Plus size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Group Create Submit Button */}
      {mode === "group" && (
        <View style={styles.footerAction}>
          <Button
            title={`Create Group (${selectedMembers.length})`}
            onPress={handleCreateGroup}
            loading={creating}
            disabled={!groupTitle.trim() || selectedMembers.length === 0}
            fullWidth
          />
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modeTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
  },
  modeTabText: {
    fontSize: 14,
  },
  groupMetaSection: {
    marginBottom: 10,
  },
  chipsContainer: {
    marginTop: 8,
  },
  chipHeader: {
    fontSize: 12,
    marginBottom: 6,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchSection: {
    marginBottom: 10,
  },
  resultsContainer: {
    minHeight: 120,
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  statusText: {
    fontSize: 13,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userMeta: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
  },
  userHandle: {
    fontSize: 13,
    marginTop: 1,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footerAction: {
    marginTop: 16,
  },
});
