import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Phone,
  Video,
  Info,
  MoreVertical,
} from "lucide-react-native";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useCalls } from "@/providers/call-provider";
import {
  useChat,
  useMessages,
  useTyping,
  useAutoRead,
  useInbox,
} from "@/hooks/use-chat-data";
import { Avatar } from "@/components/ui/Avatar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Composer } from "@/components/chat/Composer";
import { ChatInfoModal } from "@/components/chat/ChatInfoModal";
import { ForwardModal } from "@/components/chat/ForwardModal";
import {
  sendMessage,
  deleteMessage,
  reactToMessage,
  setTyping,
} from "@/lib/supabase/chats";
import type { OmiMessage } from "@/lib/types";

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const chatId = Array.isArray(id) ? id[0] : id;

  const { user } = useAuth();
  const { theme } = useTheme();
  const { startCall } = useCalls();

  const { chat, loading: chatLoading } = useChat(chatId || null);
  const {
    messages,
    loading: messagesLoading,
    addOptimistic,
    removeOptimistic,
  } = useMessages(chatId || null);
  const typingUsers = useTyping(chatId || null);
  const { chats: allChats } = useInbox(user?.id ?? null);

  const [replyTo, setReplyTo] = useState<OmiMessage | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardTargetMessage, setForwardTargetMessage] = useState<OmiMessage | null>(null);

  const flatListRef = useRef<FlatList>(null);

  // Auto-mark as read
  const lastMsg = messages[messages.length - 1];
  useAutoRead(chatId || null, user?.id ?? null, lastMsg?.id);

  const handleSend = async (text: string) => {
    if (!chat || !user || !text.trim()) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg: OmiMessage = {
      id: tempId,
      chatId: chat.id,
      senderId: user.id,
      senderName: user.displayName || user.username || "Me",
      senderAvatar: user.avatarUrl,
      text: text.trim(),
      kind: "text",
      createdAt: Date.now(),
      status: "sending",
      replyTo: replyTo
        ? {
            id: replyTo.id,
            text: replyTo.text,
            senderName: replyTo.senderName,
          }
        : null,
    };

    addOptimistic(optimisticMsg);
    setReplyTo(null);

    try {
      await sendMessage({
        chat,
        senderId: user.id,
        senderName: user.displayName || user.username || "Me",
        text: text.trim(),
        replyTo: optimisticMsg.replyTo,
      });
    } catch (err: any) {
      removeOptimistic(tempId);
      Alert.alert("Error sending message", err.message || "Please check your connection.");
    }
  };

  const handleAttach = async (file: { uri: string; name: string; type: string; size?: number }) => {
    if (!chat || !user) return;

    const isImg = file.type.startsWith("image/");
    const kind = isImg ? "image" : "file";
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const optimisticMsg: OmiMessage = {
      id: tempId,
      chatId: chat.id,
      senderId: user.id,
      senderName: user.displayName || user.username || "Me",
      senderAvatar: user.avatarUrl,
      text: isImg ? "" : file.name,
      kind,
      mediaUrl: file.uri,
      mediaName: file.name,
      mediaSize: file.size,
      createdAt: Date.now(),
      status: "sending",
    };

    addOptimistic(optimisticMsg);

    try {
      await sendMessage({
        chat,
        senderId: user.id,
        senderName: user.displayName || user.username || "Me",
        text: isImg ? "" : file.name,
        kind,
        attachmentUrl: file.uri,
        attachmentName: file.name,
        attachmentSize: file.size,
      });
    } catch (err: any) {
      removeOptimistic(tempId);
      Alert.alert("Error uploading attachment", err.message || "Failed to send attachment.");
    }
  };

  const handleVoice = async (durationSec: number) => {
    if (!chat || !user) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg: OmiMessage = {
      id: tempId,
      chatId: chat.id,
      senderId: user.id,
      senderName: user.displayName || user.username || "Me",
      senderAvatar: user.avatarUrl,
      text: `Voice note (${durationSec}s)`,
      kind: "audio",
      createdAt: Date.now(),
      status: "sending",
    };

    addOptimistic(optimisticMsg);

    try {
      await sendMessage({
        chat,
        senderId: user.id,
        senderName: user.displayName || user.username || "Me",
        text: `Voice note (${durationSec}s)`,
        kind: "audio",
      });
    } catch (err: any) {
      removeOptimistic(tempId);
      Alert.alert("Error sending voice note", err.message || "Failed to send voice message.");
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!chat || !user) return;
    try {
      await reactToMessage(chat.id, msgId, user.id, emoji);
    } catch (err: any) {
      console.error("React error", err);
    }
  };

  const handleDelete = async (msgId: string) => {
    if (!chat) return;
    try {
      await deleteMessage(chat.id, msgId);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to delete message");
    }
  };

  const handleStartCall = async (kind: "audio" | "video") => {
    if (!chat || !user) return;
    const peerUid = Object.keys(chat.members || {}).find((m) => m !== user.id);
    if (!peerUid) return;

    try {
      const callId = await startCall({
        peerId: peerUid,
        peerName: chat.title,
        kind,
        chatId: chat.id,
      });

      router.push({
        pathname: "/call/[id]",
        params: {
          id: callId,
          peerId: peerUid,
          peerName: chat.title,
          kind,
        },
      });
    } catch (err: any) {
      Alert.alert("Call Error", err.message || "Unable to start call.");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Chat Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ArrowLeft size={22} color={theme.colors.foreground} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setInfoModalOpen(true)}
          style={styles.headerInfo}
        >
          <Avatar
            src={chat?.avatarUrl}
            name={chat?.title || "Chat"}
            size={38}
            isOnline={chat?.isOnline}
          />
          <View style={styles.headerTextCol}>
            <Text
              style={[styles.headerTitle, { color: theme.colors.foreground }]}
              numberOfLines={1}
            >
              {chat?.title || "Conversation"}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                {
                  color:
                    typingUsers.length > 0
                      ? theme.colors.primary
                      : chat?.isOnline
                      ? "#22c55e"
                      : theme.colors.mutedForeground,
                },
              ]}
              numberOfLines={1}
            >
              {typingUsers.length > 0
                ? `${typingUsers.join(", ")} typing...`
                : chat?.isOnline
                ? "Online"
                : chat?.kind === "group"
                ? `${Object.keys(chat.members || {}).length} members`
                : "Offline"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action Controls */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => handleStartCall("audio")}
            style={[styles.headerActionBtn, { backgroundColor: theme.colors.muted }]}
          >
            <Phone size={18} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleStartCall("video")}
            style={[styles.headerActionBtn, { backgroundColor: theme.colors.muted }]}
          >
            <Video size={18} color={theme.colors.foreground} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setInfoModalOpen(true)}
            style={[styles.headerActionBtn, { backgroundColor: theme.colors.muted }]}
          >
            <Info size={18} color={theme.colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages Stream */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.contentWrap}
      >
        {messagesLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                previousMessage={messages[index - 1]}
                nextMessage={messages[index + 1]}
                chat={chat!}
                onReply={(msg) => setReplyTo(msg)}
                onForward={(msg) => {
                  setForwardTargetMessage(msg);
                  setForwardModalOpen(true);
                }}
                onDelete={handleDelete}
                onReact={handleReact}
              />
            )}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Composer */}
        {chat && (
          <Composer
            chatId={chat.id}
            onSend={handleSend}
            onAttach={handleAttach}
            onVoice={handleVoice}
            onTyping={(typing) => {
              if (user && chat) {
                setTyping(
                  chat.id,
                  user.id,
                  typing ? user.displayName || user.username || "Someone" : null,
                );
              }
            }}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        )}
      </KeyboardAvoidingView>

      {/* Modals */}
      <ChatInfoModal
        chat={chat}
        visible={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
        onLeaveOrDelete={() => router.back()}
      />

      <ForwardModal
        visible={forwardModalOpen}
        message={forwardTargetMessage}
        chats={allChats}
        onClose={() => {
          setForwardModalOpen(false);
          setForwardTargetMessage(null);
        }}
        onForwarded={(targetChatId) => {
          router.replace({
            pathname: "/chat/[id]",
            params: { id: targetChatId },
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
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 8,
    marginRight: 2,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 2,
  },
  headerTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 4,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrap: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
});
