package app.octadevs.omichat.data.supabase

import app.octadevs.omichat.data.model.ChatKind
import app.octadevs.omichat.data.model.LastMessageInfo
import app.octadevs.omichat.data.model.MessageKind
import app.octadevs.omichat.data.model.OmiChat
import app.octadevs.omichat.data.model.OmiMessage
import app.octadevs.omichat.data.model.OmiUser
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID

class ChatRepository(
    private val authRepo: AuthRepository = AuthRepository()
) {
    private val postgrest = SupabaseClientProvider.postgrest
    private val storage = SupabaseClientProvider.storage

    suspend fun getInbox(): List<OmiChat> {
        val uid = authRepo.currentUserId ?: return emptyList()
        return runCatching {
            // First try get_inbox RPC if present
            try {
                postgrest.rpc("get_inbox").decodeList<OmiChat>()
            } catch (e: Exception) {
                // Fallback direct query on chats
                postgrest.from("chats")
                    .select()
                    .decodeList<OmiChat>()
            }
        }.getOrElse { emptyList() }
    }

    suspend fun getMessages(chatId: String): List<OmiMessage> {
        return runCatching {
            postgrest.from("messages")
                .select {
                    filter {
                        eq("chat_id", chatId)
                    }
                    order("created_at", Order.DESCENDING)
                    limit(100)
                }
                .decodeList<OmiMessage>()
        }.getOrElse { emptyList() }
    }

    suspend fun sendMessage(
        chatId: String,
        text: String,
        kind: MessageKind = MessageKind.TEXT,
        attachmentUrl: String? = null,
        attachmentName: String? = null,
        attachmentSize: Long? = null,
        replyToId: String? = null,
        replyToText: String? = null,
        replyToSender: String? = null
    ): Result<OmiMessage> = runCatching {
        val uid = authRepo.currentUserId ?: throw IllegalStateException("Not signed in")
        val profile = authRepo.getCurrentProfile()
        val senderName = profile?.name ?: "User"

        val messageJson = buildJsonObject {
            put("chat_id", chatId)
            put("sender_id", uid)
            put("sender_name", senderName)
            put("text", text)
            put("kind", kind.name.lowercase())
            attachmentUrl?.let { put("attachment_url", it) }
            attachmentName?.let { put("attachment_name", it) }
            attachmentSize?.let { put("attachment_size", it) }
            if (replyToId != null) {
                put("reply_to", buildJsonObject {
                    put("id", replyToId)
                    put("text", replyToText ?: "")
                    put("senderName", replyToSender ?: "")
                })
            }
        }

        postgrest.from("messages")
            .insert(messageJson) {
                select()
            }
            .decodeSingle<OmiMessage>()
    }

    suspend fun uploadAttachment(
        chatId: String,
        fileName: String,
        data: ByteArray
    ): Result<String> = runCatching {
        val uid = authRepo.currentUserId ?: throw IllegalStateException("Not signed in")
        val path = "$uid/$chatId/${UUID.randomUUID()}_$fileName"
        val bucket = storage.from("attachments")
        bucket.upload(path, data, upsert = true)
        bucket.publicUrl(path)
    }

    suspend fun searchUsers(query: String): List<OmiUser> {
        if (query.isBlank()) return emptyList()
        val uid = authRepo.currentUserId ?: ""
        return runCatching {
            postgrest.from("profiles")
                .select {
                    filter {
                        ilike("username", "%${query.trim()}%")
                        neq("id", uid)
                    }
                    limit(20)
                }
                .decodeList<OmiUser>()
        }.getOrElse { emptyList() }
    }

    suspend fun createDirectChat(targetUser: OmiUser): Result<OmiChat> = runCatching {
        val uid = authRepo.currentUserId ?: throw IllegalStateException("Not signed in")
        
        // Deterministic ID for direct chat between 2 users
        val sortedIds = listOf(uid, targetUser.id).sorted()
        val directChatId = UUID.nameUUIDFromBytes("${sortedIds[0]}:${sortedIds[1]}".toByteArray()).toString()

        val chatJson = buildJsonObject {
            put("id", directChatId)
            put("kind", "direct")
            put("title", targetUser.name)
            put("created_by", uid)
        }

        val chat = try {
            postgrest.from("chats")
                .insert(chatJson) {
                    select()
                }
                .decodeSingle<OmiChat>()
        } catch (e: Exception) {
            // Already exists, fetch it
            postgrest.from("chats")
                .select {
                    filter { eq("id", directChatId) }
                }
                .decodeSingle<OmiChat>()
        }

        // Ensure memberships
        runCatching {
            postgrest.from("chat_members").insert(
                listOf(
                    buildJsonObject {
                        put("chat_id", directChatId)
                        put("user_id", uid)
                    },
                    buildJsonObject {
                        put("chat_id", directChatId)
                        put("user_id", targetUser.id)
                    }
                )
            )
        }

        chat
    }

    suspend fun createGroupChat(title: String, memberIds: List<String>): Result<OmiChat> = runCatching {
        val uid = authRepo.currentUserId ?: throw IllegalStateException("Not signed in")
        val groupId = UUID.randomUUID().toString()

        val chatJson = buildJsonObject {
            put("id", groupId)
            put("kind", "group")
            put("title", title.trim())
            put("created_by", uid)
        }

        val chat = postgrest.from("chats")
            .insert(chatJson) {
                select()
            }
            .decodeSingle<OmiChat>()

        val allMembers = (memberIds + uid).distinct()
        runCatching {
            val rows = allMembers.map { memberId ->
                buildJsonObject {
                    put("chat_id", groupId)
                    put("user_id", memberId)
                }
            }
            postgrest.from("chat_members").insert(rows)
        }

        chat
    }

    suspend fun markChatRead(chatId: String, messageId: String? = null) {
        val uid = authRepo.currentUserId ?: return
        runCatching {
            postgrest.rpc(
                "mark_chat_read",
                buildJsonObject {
                    put("p_chat_id", chatId)
                    messageId?.let { put("p_message_id", it) }
                }
            )
        }
    }
}
