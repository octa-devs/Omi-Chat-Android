package app.octadevs.omichat.data.supabase

import app.octadevs.omichat.data.model.ChatKind
import app.octadevs.omichat.data.model.MessageKind
import app.octadevs.omichat.data.model.OmiChat
import app.octadevs.omichat.data.model.OmiMessage
import app.octadevs.omichat.data.model.OmiUser
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class ChatRepository(
    private val authRepo: AuthRepository = AuthRepository()
) {
    private val postgrest = SupabaseClientProvider.postgrest
    private val storage = SupabaseClientProvider.storage

    companion object {
        private val profileCache = ConcurrentHashMap<String, OmiUser>()
    }

    suspend fun getUserProfile(userId: String): OmiUser? {
        if (userId.isBlank()) return null
        profileCache[userId]?.let { return it }

        return runCatching {
            val user = postgrest.from("profiles")
                .select {
                    filter { eq("id", userId) }
                }
                .decodeSingleOrNull<OmiUser>()
            if (user != null) {
                profileCache[userId] = user
            }
            user
        }.getOrNull()
    }

    suspend fun getInbox(): List<OmiChat> = withContext(Dispatchers.IO) {
        val uid = authRepo.currentUserId ?: return@withContext emptyList()
        val rawChats = runCatching {
            try {
                postgrest.rpc("get_inbox").decodeList<OmiChat>()
            } catch (e: Exception) {
                postgrest.from("chats")
                    .select()
                    .decodeList<OmiChat>()
            }
        }.getOrElse { emptyList() }

        // Resolve peer user for each direct chat in parallel
        coroutineScope {
            rawChats.map { chat ->
                async {
                    if (chat.kind == ChatKind.DIRECT) {
                        val peerId = chat.members?.keys?.firstOrNull { it != uid }
                            ?: findPeerIdForDirectChat(chat.id, uid)
                        if (peerId != null) {
                            val peer = getUserProfile(peerId)
                            chat.copy(peerUser = peer)
                        } else {
                            chat
                        }
                    } else {
                        chat
                    }
                }
            }.awaitAll()
        }
    }

    private suspend fun findPeerIdForDirectChat(chatId: String, currentUid: String): String? {
        return runCatching {
            val rows = postgrest.from("chat_members")
                .select {
                    filter {
                        eq("chat_id", chatId)
                        neq("user_id", currentUid)
                    }
                    limit(1)
                }
                .decodeList<Map<String, String>>()
            rows.firstOrNull()?.get("user_id")
        }.getOrNull()
    }

    suspend fun getChat(chatId: String): OmiChat? = withContext(Dispatchers.IO) {
        val uid = authRepo.currentUserId ?: return@withContext null
        runCatching {
            val chat = postgrest.from("chats")
                .select {
                    filter { eq("id", chatId) }
                }
                .decodeSingleOrNull<OmiChat>() ?: return@runCatching null

            if (chat.kind == ChatKind.DIRECT) {
                val peerId = chat.members?.keys?.firstOrNull { it != uid }
                    ?: findPeerIdForDirectChat(chat.id, uid)
                if (peerId != null) {
                    val peer = getUserProfile(peerId)
                    chat.copy(peerUser = peer)
                } else {
                    chat
                }
            } else {
                chat
            }
        }.getOrNull()
    }

    suspend fun getMessages(chatId: String): List<OmiMessage> = withContext(Dispatchers.IO) {
        runCatching {
            postgrest.from("messages")
                .select {
                    filter {
                        eq("chat_id", chatId)
                    }
                    order("created_at", Order.DESCENDING)
                    limit(80)
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
        bucket.upload(path, data) {
            upsert = true
        }
        bucket.publicUrl(path)
    }

    suspend fun searchUsers(query: String): List<OmiUser> = withContext(Dispatchers.IO) {
        if (query.isBlank()) return@withContext emptyList()
        val uid = authRepo.currentUserId ?: ""
        runCatching {
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
        profileCache[targetUser.id] = targetUser
        
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
            postgrest.from("chats")
                .select {
                    filter { eq("id", directChatId) }
                }
                .decodeSingle<OmiChat>()
        }

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

        chat.copy(peerUser = targetUser)
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
