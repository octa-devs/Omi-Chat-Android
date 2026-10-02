package app.octadevs.omichat.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class PresenceState {
    @SerialName("online") ONLINE,
    @SerialName("away") AWAY,
    @SerialName("busy") BUSY,
    @SerialName("offline") OFFLINE
}

@Serializable
data class UserSettings(
    val theme: String = "aurora",
    val accent: String = "azure",
    @SerialName("enter_to_send") val enterToSend: Boolean = true,
    @SerialName("read_receipts") val readReceipts: Boolean = true,
    @SerialName("typing_indicator") val typingIndicator: Boolean = true,
    @SerialName("message_sounds") val messageSounds: Boolean = true
)

@Serializable
data class OmiUser(
    val id: String = "",
    val username: String = "",
    @SerialName("display_name") val displayName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val bio: String? = null,
    @SerialName("status_text") val statusText: String? = null,
    val presence: PresenceState = PresenceState.OFFLINE,
    @SerialName("last_seen") val lastSeen: String? = null,
    @SerialName("created_at") val createdAt: String? = null
) {
    val name: String get() = displayName?.takeIf { it.isNotBlank() } ?: username.takeIf { it.isNotBlank() } ?: "User"
}

@Serializable
enum class MessageKind {
    @SerialName("text") TEXT,
    @SerialName("image") IMAGE,
    @SerialName("file") FILE,
    @SerialName("audio") AUDIO,
    @SerialName("call") CALL,
    @SerialName("system") SYSTEM
}

@Serializable
data class ReplyInfo(
    val id: String,
    val text: String = "",
    @SerialName("senderName") val senderName: String = ""
)

@Serializable
data class OmiMessage(
    val id: String = "",
    @SerialName("chat_id") val chatId: String = "",
    @SerialName("sender_id") val senderId: String = "",
    @SerialName("sender_name") val senderName: String? = "User",
    val text: String = "",
    val kind: MessageKind = MessageKind.TEXT,
    @SerialName("attachment_url") val attachmentUrl: String? = null,
    @SerialName("attachment_name") val attachmentName: String? = null,
    @SerialName("attachment_size") val attachmentSize: Long? = null,
    @SerialName("reply_to") val replyTo: ReplyInfo? = null,
    @SerialName("edited_at") val editedAt: String? = null,
    val deleted: Boolean = false,
    @SerialName("created_at") val createdAt: String = "",
    // Local state
    val isSending: Boolean = false,
    val isFailed: Boolean = false
)

@Serializable
enum class ChatKind {
    @SerialName("direct") DIRECT,
    @SerialName("group") GROUP
}

@Serializable
data class LastMessageInfo(
    val id: String = "",
    val text: String = "",
    @SerialName("sender_id") val senderId: String = "",
    @SerialName("sender_name") val senderName: String = "",
    val kind: MessageKind = MessageKind.TEXT,
    @SerialName("created_at") val createdAt: String = ""
)

@Serializable
data class OmiChat(
    val id: String = "",
    val kind: ChatKind = ChatKind.DIRECT,
    val title: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("created_by") val createdBy: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("last_activity") val lastActivity: String? = null,
    @SerialName("last_message") val lastMessage: LastMessageInfo? = null,
    val unread: Int = 0,
    val pinned: Boolean = false,
    val muted: Boolean = false
)
