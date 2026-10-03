import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Alert,
} from "react-native";
import {
  ArrowUp,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Square,
  CornerUpLeft,
  X,
  Laugh,
  Heart,
  ThumbsUp,
  Frown,
  Meh,
  Flame,
  Star,
  Zap,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../../providers/theme-provider";
import { saveDraft, getDraft } from "../../hooks/use-chat-data";
import type { OmiMessage } from "../../lib/types";

const MAX_MSG_LENGTH = 4000;

const EMOJI_ICONS = [
  { icon: Smile, emoji: "😀", label: "Smile" },
  { icon: Laugh, emoji: "😂", label: "Laugh" },
  { icon: Heart, emoji: "❤️", label: "Heart" },
  { icon: ThumbsUp, emoji: "👍", label: "Like" },
  { icon: Frown, emoji: "😢", label: "Sad" },
  { icon: Meh, emoji: "🤔", label: "Thinking" },
  { icon: Flame, emoji: "🔥", label: "Fire" },
  { icon: Star, emoji: "⭐", label: "Star" },
  { icon: Zap, emoji: "⚡", label: "Zap" },
];

export function Composer({
  chatId,
  onSend,
  onAttach,
  onVoice,
  onTyping,
  replyTo,
  onCancelReply,
  disabled,
  placeholder = "Type a message…",
}: {
  chatId?: string;
  onSend: (text: string) => Promise<void> | void;
  onAttach?: (file: { uri: string; name: string; type: string; size?: number }) => Promise<void> | void;
  onVoice?: (durationSec: number) => Promise<void> | void;
  onTyping?: (typing: boolean) => void;
  replyTo?: OmiMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { theme, isDark } = useTheme();
  const [text, setText] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  // Restore draft
  useEffect(() => {
    if (!chatId) return;
    getDraft(chatId).then((draft) => {
      if (draft) setText(draft);
    });
  }, [chatId]);

  // Persist draft
  useEffect(() => {
    if (!chatId) return;
    saveDraft(chatId, text);
  }, [chatId, text]);

  const handleTypingSignal = (val: string) => {
    if (!onTyping) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (!isTyping.current && val.trim()) {
      isTyping.current = true;
      onTyping(true);
    }
    typingTimer.current = setTimeout(() => {
      if (isTyping.current) {
        isTyping.current = false;
        onTyping(false);
      }
    }, 2000);
  };

  const handleSend = () => {
    const clean = text.trim();
    if (!clean || disabled) return;
    setText("");
    if (chatId) saveDraft(chatId, "");
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      onTyping?.(false);
    }
    onCancelReply?.();
    void onSend(clean);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        onAttach?.({
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize,
        });
      }
    } catch {
      Alert.alert("Permission required", "Allow photo library access to send images.");
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        onAttach?.({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/octet-stream",
          size: asset.size,
        });
      }
    } catch {
      // document picker cancel/error
    }
  };

  const startRecord = () => {
    setRecording(true);
    setRecordSecs(0);
    timerRef.current = setInterval(() => {
      setRecordSecs((s) => s + 1);
    }, 1000);
  };

  const stopRecord = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    if (recordSecs > 1) {
      onVoice?.(recordSecs);
    }
    setRecordSecs(0);
  };

  const cancelRecord = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setRecordSecs(0);
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const remaining = MAX_MSG_LENGTH - text.length;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: isDark
            ? theme.colors.surface
            : theme.palette.ink900,
          borderTopColor: isDark
            ? "rgba(255, 255, 255, 0.08)"
            : theme.colors.border,
        },
      ]}
    >
      {/* Reply to bar */}
      {replyTo && (
        <View
          style={[
            styles.replyBar,
            {
              backgroundColor: theme.colors.brandSoft,
              borderColor: theme.colors.brandBorder,
            },
          ]}
        >
          <CornerUpLeft size={16} color={theme.colors.brand} />
          <View style={styles.replyContent}>
            <Text style={[styles.replyAuthor, { color: theme.colors.brand }]}>
              Replying to {replyTo.senderName}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.replyText, { color: theme.colors.textSecondary }]}
            >
              {replyTo.text || "Attachment"}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Emoji tray */}
      {emojiOpen && (
        <View
          style={[
            styles.emojiTray,
            {
              backgroundColor: isDark
                ? theme.palette.ink850
                : theme.palette.ink800,
              borderColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : theme.colors.border,
            },
          ]}
        >
          {EMOJI_ICONS.map(({ icon: Icon, emoji, label }) => (
            <TouchableOpacity
              key={label}
              onPress={() => {
                setText((t) => t + emoji);
                setEmojiOpen(false);
              }}
              style={styles.emojiBtn}
            >
              <Icon size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Voice recording bar */}
      {recording && (
        <View
          style={[
            styles.recordingBar,
            {
              backgroundColor: theme.colors.dangerSoft,
              borderColor: theme.palette.rust200,
            },
          ]}
        >
          <View style={[styles.recDot, { backgroundColor: theme.colors.danger }]} />
          <Text style={[styles.recText, { color: theme.colors.danger }]}>
            Recording — {formatSecs(recordSecs)}
          </Text>
          <TouchableOpacity onPress={cancelRecord} style={styles.cancelRecBtn}>
            <X size={16} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      )}

      {/* Composer Row */}
      <View
        style={[
          styles.composerRow,
          {
            backgroundColor: isDark
              ? "rgba(255, 255, 255, 0.05)"
              : theme.palette.ink800,
            borderColor: isDark
              ? "rgba(255, 255, 255, 0.1)"
              : theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setEmojiOpen((v) => !v)}
          style={styles.actionIcon}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Smile
            size={22}
            color={emojiOpen ? theme.colors.brand : theme.colors.textMuted}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={pickDocument}
          disabled={recording}
          style={styles.actionIcon}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Paperclip size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={pickImage}
          disabled={recording}
          style={styles.actionIcon}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ImageIcon size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            handleTypingSignal(v);
          }}
          placeholder={recording ? "Recording voice note…" : placeholder}
          placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
          maxLength={MAX_MSG_LENGTH}
          multiline
          editable={!recording && !disabled}
          style={[
            styles.input,
            {
              color: theme.colors.text,
            },
          ]}
        />

        {text.trim() ? (
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendBtn,
              { backgroundColor: theme.colors.brand },
            ]}
          >
            <ArrowUp size={20} color="#ffffff" />
          </TouchableOpacity>
        ) : onVoice ? (
          <TouchableOpacity
            onPressIn={startRecord}
            onPressOut={stopRecord}
            style={[
              styles.voiceBtn,
              {
                backgroundColor: recording
                  ? theme.colors.danger
                  : isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : theme.palette.ink750,
              },
            ]}
          >
            {recording ? (
              <Square size={18} color="#ffffff" />
            ) : (
              <Mic size={20} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {remaining < 200 && (
        <Text style={[styles.limitText, { color: theme.colors.textMuted }]}>
          {remaining} / {MAX_MSG_LENGTH}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    borderTopWidth: 1,
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  replyContent: {
    flex: 1,
  },
  replyAuthor: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  replyText: {
    fontSize: 13,
    marginTop: 1,
  },
  emojiTray: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  emojiBtn: {
    width: "11%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  cancelRecBtn: {
    padding: 4,
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 48,
  },
  actionIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  limitText: {
    fontSize: 10,
    textAlign: "right",
    marginTop: 4,
    paddingRight: 6,
  },
});
