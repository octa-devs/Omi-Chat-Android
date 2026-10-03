import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import {
  Bell,
  BellOff,
  Pin,
  Trash2,
  UserPlus,
  LogOut,
  Shield,
  UserX,
  Users,
} from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { useSettings } from "@/providers/settings-provider";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Switch } from "@/components/ui/Switch";
import { leaveChat } from "@/lib/supabase/chats";
import type { OmiChat } from "@/lib/types";

interface ChatInfoModalProps {
  chat: OmiChat | null;
  visible: boolean;
  onClose: () => void;
  onLeaveOrDelete?: () => void;
}

export function ChatInfoModal({
  chat,
  visible,
  onClose,
  onLeaveOrDelete,
}: ChatInfoModalProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isPinned, togglePin, isMuted, toggleMute, isBlocked, toggleBlock } =
    useSettings();

  if (!chat) return null;

  const isGroup = chat.kind === "group";
  const pinned = isPinned(chat.id);
  const muted = isMuted(chat.id);

  // Find peer UID if direct chat
  const peerUid = !isGroup
    ? Object.keys(chat.members || {}).find((id) => id !== user?.id)
    : null;
  const blocked = peerUid ? isBlocked(peerUid) : false;

  const handleLeaveGroup = () => {
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave "${chat.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            if (!user) return;
            try {
              await leaveChat(chat.id, user.id);
              onClose();
              onLeaveOrDelete?.();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to leave group");
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Conversation Info">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.headerCard}>
          <Avatar
            src={chat.avatarUrl}
            name={chat.title}
            size={72}
            isOnline={chat.isOnline}
          />
          <Text style={[styles.title, { color: theme.colors.foreground }]}>
            {chat.title}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>
            {isGroup
              ? `Group • ${Object.keys(chat.members || {}).length} participants`
              : "Direct Conversation"}
          </Text>
        </View>

        {/* Action Toggles Section */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingMeta}>
              <Pin size={18} color={theme.colors.foreground} />
              <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>
                Pin Conversation
              </Text>
            </View>
            <Switch value={pinned} onValueChange={() => togglePin(chat.id)} />
          </View>

          <View
            style={[
              styles.settingRow,
              { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
            ]}
          >
            <View style={styles.settingMeta}>
              {muted ? (
                <BellOff size={18} color={theme.colors.foreground} />
              ) : (
                <Bell size={18} color={theme.colors.foreground} />
              )}
              <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>
                Mute Notifications
              </Text>
            </View>
            <Switch value={muted} onValueChange={() => toggleMute(chat.id)} />
          </View>

          {peerUid && (
            <View
              style={[
                styles.settingRow,
                { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
              ]}
            >
              <View style={styles.settingMeta}>
                <UserX size={18} color={theme.colors.danger} />
                <Text style={[styles.settingLabel, { color: theme.colors.danger }]}>
                  Block Contact
                </Text>
              </View>
              <Switch value={blocked} onValueChange={() => toggleBlock(peerUid)} />
            </View>
          )}
        </View>

        {/* Group Participants List */}
        {isGroup && (
          <View style={styles.participantsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.mutedForeground }]}>
              PARTICIPANTS ({Object.keys(chat.members || {}).length})
            </Text>

            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {Object.keys(chat.members || {}).map((uid, idx) => {
                const isMe = uid === user?.id;
                const isAdmin = Boolean(chat.admins?.[uid]);
                const memberName = isMe ? (user?.displayName || user?.username || "You") : `Member (${uid.slice(0, 6)})`;
                return (
                  <View
                    key={uid}
                    style={[
                      styles.memberRow,
                      idx > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Avatar name={memberName} size={36} />
                    <View style={styles.memberInfo}>
                      <Text
                        style={[styles.memberName, { color: theme.colors.foreground }]}
                        numberOfLines={1}
                      >
                        {memberName}{" "}
                        {isMe && <Text style={{ color: theme.colors.primary }}>(You)</Text>}
                      </Text>
                    </View>
                    {isAdmin && (
                      <View
                        style={[
                          styles.adminBadge,
                          { backgroundColor: theme.colors.primary + "20" },
                        ]}
                      >
                        <Shield size={12} color={theme.colors.primary} />
                        <Text
                          style={[styles.adminText, { color: theme.colors.primary }]}
                        >
                          Admin
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Leave or Delete Action */}
        <View style={styles.dangerZone}>
          {isGroup ? (
            <TouchableOpacity
              onPress={handleLeaveGroup}
              style={[styles.dangerBtn, { borderColor: theme.colors.danger + "40" }]}
            >
              <LogOut size={18} color={theme.colors.danger} />
              <Text style={[styles.dangerBtnText, { color: theme.colors.danger }]}>
                Leave Group
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    alignItems: "center",
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginVertical: 10,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  participantsSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "600",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  adminText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dangerZone: {
    marginTop: 16,
    marginBottom: 24,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  dangerBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
