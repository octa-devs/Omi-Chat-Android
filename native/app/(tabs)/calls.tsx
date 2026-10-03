import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Plus,
} from "lucide-react-native";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useCalls } from "@/providers/call-provider";
import { Avatar } from "@/components/ui/Avatar";
import { NewChatModal } from "@/components/chat/NewChatModal";
import { getSupabase } from "@/lib/supabase/client";

interface CallLogItem {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatar?: string | null;
  kind: "audio" | "video";
  status: "completed" | "missed" | "declined" | "canceled";
  direction: "incoming" | "outgoing";
  createdAt: number;
  duration?: number;
}

export default function CallsTab() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { startCall } = useCalls();

  const [callLogs, setCallLogs] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch call logs from DB
    const fetchLogs = async () => {
      try {
        const { data, error } = await getSupabase()
          .from("calls")
          .select("id, host_id, kind, status, created_at, started_at, ended_at, call_participants(user_id)")
          .order("created_at", { ascending: false })
          .limit(30);

        if (!error && data) {
          const formatted: CallLogItem[] = data.map((c: any) => {
            const isHost = c.host_id === user.id;
            const start = c.started_at ? new Date(c.started_at).getTime() : null;
            const end = c.ended_at ? new Date(c.ended_at).getTime() : null;
            const duration = start && end ? Math.round((end - start) / 1000) : 0;

            return {
              id: c.id,
              peerId: isHost ? (c.call_participants?.[0]?.user_id || "Peer") : c.host_id,
              peerName: isHost ? "Call Participant" : "Host",
              kind: c.kind || "audio",
              status: c.status || "completed",
              direction: isHost ? "outgoing" : "incoming",
              createdAt: new Date(c.created_at).getTime(),
              duration,
            };
          });
          setCallLogs(formatted);
        }
      } catch (err) {
        console.error("Error fetching call logs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [user]);

  const handleStartCall = async (peerId: string, peerName: string, kind: "audio" | "video") => {
    try {
      await startCall({
        peerId,
        peerName,
        kind,
        chatId: null,
      });
    } catch (err: any) {
      Alert.alert("Call Error", err.message || "Could not place call.");
    }
  };

  const renderItem = ({ item }: { item: CallLogItem }) => {
    const isMissed = item.status === "missed" || item.status === "declined";

    return (
      <View
        style={[
          styles.callRow,
          { borderBottomColor: theme.colors.border },
        ]}
      >
        <Avatar name={item.peerName} src={item.peerAvatar} size={46} />

        <View style={styles.callMeta}>
          <Text
            style={[
              styles.peerName,
              { color: isMissed ? theme.colors.danger : theme.colors.foreground },
            ]}
            numberOfLines={1}
          >
            {item.peerName}
          </Text>

          <View style={styles.statusRow}>
            {item.direction === "incoming" ? (
              isMissed ? (
                <PhoneMissed size={14} color={theme.colors.danger} />
              ) : (
                <PhoneIncoming size={14} color={theme.colors.primary} />
              )
            ) : (
              <PhoneOutgoing size={14} color={theme.colors.mutedForeground} />
            )}

            <Text style={[styles.timeText, { color: theme.colors.mutedForeground }]}>
              {new Date(item.createdAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {item.duration ? ` • ${Math.floor(item.duration / 60)}m ${item.duration % 60}s` : ""}
            </Text>
          </View>
        </View>

        {/* Action icons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => handleStartCall(item.peerId, item.peerName, "audio")}
            style={[styles.callBtn, { backgroundColor: theme.colors.primary + "1A" }]}
          >
            <Phone size={18} color={theme.colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleStartCall(item.peerId, item.peerName, "video")}
            style={[styles.callBtn, { backgroundColor: theme.colors.primary + "1A" }]}
          >
            <Video size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>
          Calls
        </Text>
      </View>

      {/* Call History List */}
      <FlatList
        data={callLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Phone size={44} color={theme.colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
              No Recent Calls
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.mutedForeground }]}>
              Voice and video calls you make and receive will appear here.
            </Text>
          </View>
        }
      />

      {/* Floating Call Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setModalOpen(true)}
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
          },
        ]}
      >
        <Phone size={24} color="#ffffff" />
      </TouchableOpacity>

      <NewChatModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onChatCreated={() => setModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  callMeta: {
    flex: 1,
    marginLeft: 14,
  },
  peerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  timeText: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
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
