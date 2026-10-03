import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
  Linking,
  Share,
  Alert,
} from "react-native";
import {
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  Headphones,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  Play,
  Pause,
  Reply,
  Star,
  Trash2,
  Copy,
  Forward,
} from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useAuth } from "@/providers/auth-provider";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import type { OmiMessage, OmiChat } from "@/lib/types";
import { toggleStar, isStarred, StarredEntry } from "@/hooks/use-chat-data";

interface MessageBubbleProps {
  message: OmiMessage;
  previousMessage?: OmiMessage;
  nextMessage?: OmiMessage;
  chat: OmiChat;
  onReply?: (msg: OmiMessage) => void;
  onForward?: (msg: OmiMessage) => void;
  onDelete?: (msgId: string) => void;
  onReact?: (msgId: string, emoji: string) => void;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "😮", "🙏", "🎉"];

export function MessageBubble({
  message,
  previousMessage,
  nextMessage,
  chat,
  onReply,
  onForward,
  onDelete,
  onReact,
}: MessageBubbleProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [starred, setStarred] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  const isMe = message.senderId === user?.id;
  const isSystem = message.kind === "system";
  const isCall = message.kind === "call";

  // Check if message is consecutive from same user
  const isFirstInSequence =
    !previousMessage || previousMessage.senderId !== message.senderId;
  const isLastInSequence =
    !nextMessage || nextMessage.senderId !== message.senderId;

  // Star status effect
  React.useEffect(() => {
    isStarred(message.id).then(setStarred);
  }, [message.id]);

  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <View
          style={[
            styles.systemPill,
            { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.systemText, { color: theme.colors.mutedForeground }]}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  }

  const handleToggleStar = async () => {
    const entry: StarredEntry = {
      messageId: message.id,
      chatId: chat.id,
      chatTitle: chat.title,
      text: message.text,
      senderName: message.senderName,
      kind: message.kind,
      createdAt: message.createdAt,
    };
    const next = await toggleStar(entry);
    setStarred(next);
    setMenuOpen(false);
  };

  const handleCopy = () => {
    // Note: react-native Clipboard or basic share
    setMenuOpen(false);
    Share.share({ message: message.text });
  };

  const timeFormatted = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <View
        style={[
          styles.row,
          isMe ? styles.rowMe : styles.rowOther,
          { marginTop: isFirstInSequence ? 6 : 2, marginBottom: isLastInSequence ? 6 : 2 },
        ]}
      >
        {/* Avatar for others in group chats when first in sequence */}
        {!isMe && chat.kind === "group" && (
          <View style={styles.avatarGutter}>
            {isLastInSequence ? (
              <Avatar
                name={message.senderName}
                src={message.senderAvatar}
                size={28}
              />
            ) : (
              <View style={{ width: 28 }} />
            )}
          </View>
        )}

        <Pressable
          onLongPress={() => setMenuOpen(true)}
          delayLongPress={280}
          style={({ pressed }) => [
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            {
              backgroundColor: isMe ? theme.colors.primary : theme.colors.surfaceElevated,
              borderColor: isMe ? "transparent" : theme.colors.border,
              borderWidth: isMe ? 0 : StyleSheet.hairlineWidth,
              opacity: pressed ? 0.9 : 1,
            },
            // Rounded corner smoothing depending on sequence
            isMe && !isFirstInSequence && { borderTopRightRadius: theme.radius.sm },
            isMe && !isLastInSequence && { borderBottomRightRadius: theme.radius.sm },
            !isMe && !isFirstInSequence && { borderTopLeftRadius: theme.radius.sm },
            !isMe && !isLastInSequence && { borderBottomLeftRadius: theme.radius.sm },
          ]}
        >
          {/* Sender name for group chats */}
          {!isMe && chat.kind === "group" && isFirstInSequence && (
            <Text
              style={[
                styles.senderName,
                { color: theme.colors.primary },
              ]}
              numberOfLines={1}
            >
              {message.senderName}
            </Text>
          )}

          {/* Reply Quote Banner */}
          {message.replyTo && (
            <View
              style={[
                styles.replyQuote,
                {
                  backgroundColor: isMe
                    ? "rgba(255,255,255,0.15)"
                    : theme.colors.card,
                  borderLeftColor: isMe ? "#ffffff" : theme.colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.replyQuoteName,
                  { color: isMe ? "#ffffff" : theme.colors.primary },
                ]}
                numberOfLines={1}
              >
                {message.replyTo.senderName}
              </Text>
              <Text
                style={[
                  styles.replyQuoteText,
                  { color: isMe ? "rgba(255,255,255,0.85)" : theme.colors.mutedForeground },
                ]}
                numberOfLines={2}
              >
                {message.replyTo.text}
              </Text>
            </View>
          )}

          {/* Message Content: Kind specific */}
          {message.kind === "image" && message.mediaUrl && (
            <View style={styles.mediaWrap}>
              <Image
                source={{ uri: message.mediaUrl }}
                style={styles.imageMedia}
                resizeMode="cover"
              />
            </View>
          )}

          {message.kind === "audio" && (
            <View style={styles.audioRow}>
              <TouchableOpacity
                onPress={() => setPlayingAudio(!playingAudio)}
                style={[
                  styles.audioPlayBtn,
                  { backgroundColor: isMe ? "rgba(255,255,255,0.25)" : theme.colors.primary },
                ]}
              >
                {playingAudio ? (
                  <Pause size={18} color="#ffffff" />
                ) : (
                  <Play size={18} color="#ffffff" style={{ marginLeft: 2 }} />
                )}
              </TouchableOpacity>
              <View style={styles.audioTrack}>
                <View
                  style={[
                    styles.audioWaveform,
                    { backgroundColor: isMe ? "rgba(255,255,255,0.4)" : theme.colors.muted },
                  ]}
                />
                <Text
                  style={[
                    styles.audioDuration,
                    { color: isMe ? "rgba(255,255,255,0.8)" : theme.colors.mutedForeground },
                  ]}
                >
                  Voice note
                </Text>
              </View>
            </View>
          )}

          {message.kind === "file" && (
            <TouchableOpacity
              onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)}
              style={[
                styles.fileCard,
                {
                  backgroundColor: isMe ? "rgba(255,255,255,0.15)" : theme.colors.background,
                  borderColor: isMe ? "transparent" : theme.colors.border,
                },
              ]}
            >
              <FileText size={24} color={isMe ? "#ffffff" : theme.colors.primary} />
              <View style={styles.fileInfo}>
                <Text
                  style={[
                    styles.fileName,
                    { color: isMe ? "#ffffff" : theme.colors.foreground },
                  ]}
                  numberOfLines={1}
                >
                  {message.mediaName || "Document"}
                </Text>
                {message.mediaSize && (
                  <Text
                    style={[
                      styles.fileMeta,
                      { color: isMe ? "rgba(255,255,255,0.7)" : theme.colors.mutedForeground },
                    ]}
                  >
                    {(message.mediaSize / 1024).toFixed(0)} KB
                  </Text>
                )}
              </View>
              <Download size={18} color={isMe ? "#ffffff" : theme.colors.primary} />
            </TouchableOpacity>
          )}

          {isCall && (
            <View style={styles.callRow}>
              <View
                style={[
                  styles.callIconBadge,
                  { backgroundColor: isMe ? "rgba(255,255,255,0.2)" : theme.colors.primary + "20" },
                ]}
              >
                <PhoneCall size={18} color={isMe ? "#ffffff" : theme.colors.primary} />
              </View>
              <Text
                style={[
                  styles.callText,
                  { color: isMe ? "#ffffff" : theme.colors.foreground },
                ]}
              >
                {message.text}
              </Text>
            </View>
          )}

          {/* Main Text Content */}
          {message.kind !== "call" && Boolean(message.text) && (
            <Text
              style={[
                styles.bubbleText,
                { color: isMe ? theme.colors.primaryForeground : theme.colors.foreground },
              ]}
            >
              {message.text}
            </Text>
          )}

          {/* Footer: Time, Star, and Status Ticks */}
          <View style={styles.footerRow}>
            {starred && (
              <Star
                size={11}
                color={isMe ? "rgba(255,255,255,0.9)" : theme.colors.accent}
                fill={isMe ? "rgba(255,255,255,0.9)" : theme.colors.accent}
                style={{ marginRight: 4 }}
              />
            )}
            <Text
              style={[
                styles.timeText,
                { color: isMe ? "rgba(255,255,255,0.7)" : theme.colors.mutedForeground },
              ]}
            >
              {timeFormatted}
            </Text>

            {isMe && (
              <View style={styles.statusGutter}>
                {message.status === "sending" ? (
                  <Clock size={12} color="rgba(255,255,255,0.6)" />
                ) : message.status === "read" ? (
                  <CheckCheck size={14} color="#60a5fa" />
                ) : message.status === "delivered" ? (
                  <CheckCheck size={14} color="rgba(255,255,255,0.85)" />
                ) : (
                  <Check size={13} color="rgba(255,255,255,0.6)" />
                )}
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {/* Emoji Reactions Bar */}
      {message.reactions && Object.keys(message.reactions).length > 0 && (
        <View
          style={[
            styles.reactionsRow,
            isMe ? { justifyContent: "flex-end", marginRight: 8 } : { justifyContent: "flex-start", marginLeft: chat.kind === "group" ? 44 : 8 },
          ]}
        >
          {Object.entries(message.reactions).map(([emoji, uids]) => {
            const hasReacted = user ? uids.includes(user.id) : false;
            return (
              <TouchableOpacity
                key={emoji}
                onPress={() => onReact?.(message.id, emoji)}
                style={[
                  styles.reactionPill,
                  {
                    backgroundColor: hasReacted
                      ? theme.colors.primary + "20"
                      : theme.colors.surfaceElevated,
                    borderColor: hasReacted
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text
                  style={[
                    styles.reactionCount,
                    {
                      color: hasReacted
                        ? theme.colors.primary
                        : theme.colors.mutedForeground,
                    },
                  ]}
                >
                  {uids.length}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Message Context / Action Modal */}
      <Modal
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Message Options"
      >
        {/* Quick Reactions Bar */}
        <View style={styles.quickReactionsTray}>
          {QUICK_REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => {
                onReact?.(message.id, emoji);
                setMenuOpen(false);
              }}
              style={styles.quickReactionBtn}
            >
              <Text style={styles.quickReactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionMenuList}>
          <TouchableOpacity
            onPress={() => {
              setMenuOpen(false);
              onReply?.(message);
            }}
            style={[styles.actionMenuItem, { borderBottomColor: theme.colors.border }]}
          >
            <Reply size={20} color={theme.colors.foreground} />
            <Text style={[styles.actionMenuText, { color: theme.colors.foreground }]}>
              Reply
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCopy}
            style={[styles.actionMenuItem, { borderBottomColor: theme.colors.border }]}
          >
            <Copy size={20} color={theme.colors.foreground} />
            <Text style={[styles.actionMenuText, { color: theme.colors.foreground }]}>
              Copy / Share
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleToggleStar}
            style={[styles.actionMenuItem, { borderBottomColor: theme.colors.border }]}
          >
            <Star
              size={20}
              color={starred ? theme.colors.accent : theme.colors.foreground}
              fill={starred ? theme.colors.accent : "transparent"}
            />
            <Text style={[styles.actionMenuText, { color: theme.colors.foreground }]}>
              {starred ? "Unstar Message" : "Star Message"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMenuOpen(false);
              onForward?.(message);
            }}
            style={[styles.actionMenuItem, { borderBottomColor: theme.colors.border }]}
          >
            <Forward size={20} color={theme.colors.foreground} />
            <Text style={[styles.actionMenuText, { color: theme.colors.foreground }]}>
              Forward
            </Text>
          </TouchableOpacity>

          {isMe && (
            <TouchableOpacity
              onPress={() => {
                setMenuOpen(false);
                onDelete?.(message.id);
              }}
              style={[styles.actionMenuItem, { borderBottomWidth: 0 }]}
            >
              <Trash2 size={20} color={theme.colors.danger} />
              <Text style={[styles.actionMenuText, { color: theme.colors.danger }]}>
                Delete Message
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 12,
    alignItems: "flex-end",
  },
  rowMe: {
    justifyContent: "flex-end",
  },
  rowOther: {
    justifyContent: "flex-start",
  },
  avatarGutter: {
    marginRight: 6,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 13,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  replyQuote: {
    padding: 6,
    borderRadius: 8,
    borderLeftWidth: 3,
    marginBottom: 6,
  },
  replyQuoteName: {
    fontSize: 11,
    fontWeight: "700",
  },
  replyQuoteText: {
    fontSize: 12,
    marginTop: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  mediaWrap: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 4,
  },
  imageMedia: {
    width: 220,
    height: 180,
    borderRadius: 12,
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    minWidth: 180,
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  audioTrack: {
    flex: 1,
    marginLeft: 10,
  },
  audioWaveform: {
    height: 4,
    borderRadius: 2,
    width: "100%",
    marginBottom: 4,
  },
  audioDuration: {
    fontSize: 11,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
    minWidth: 180,
  },
  fileInfo: {
    flex: 1,
    marginHorizontal: 8,
  },
  fileName: {
    fontSize: 13,
    fontWeight: "600",
  },
  fileMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  callIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  callText: {
    fontSize: 13,
    fontWeight: "500",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  timeText: {
    fontSize: 10,
  },
  statusGutter: {
    marginLeft: 4,
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: -2,
    marginBottom: 4,
    gap: 4,
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 10,
    fontWeight: "600",
  },
  quickReactionsTray: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(150,150,150,0.2)",
  },
  quickReactionBtn: {
    padding: 6,
  },
  quickReactionEmoji: {
    fontSize: 26,
  },
  actionMenuList: {
    paddingBottom: 8,
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  actionMenuText: {
    fontSize: 16,
    fontWeight: "500",
  },
  systemContainer: {
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  systemPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  systemText: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});
