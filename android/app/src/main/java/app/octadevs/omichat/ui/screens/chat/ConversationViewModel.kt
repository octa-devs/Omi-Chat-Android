package app.octadevs.omichat.ui.screens.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.octadevs.omichat.data.model.MessageKind
import app.octadevs.omichat.data.model.OmiMessage
import app.octadevs.omichat.data.model.ReplyInfo
import app.octadevs.omichat.data.supabase.AuthRepository
import app.octadevs.omichat.data.supabase.ChatRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

data class ConversationUiState(
    val chatId: String = "",
    val title: String = "",
    val avatarUrl: String? = null,
    val messages: List<OmiMessage> = emptyList(),
    val replyTo: ReplyInfo? = null,
    val currentUserId: String = "",
    val isLoading: Boolean = false,
    val error: String? = null
)

class ConversationViewModel(
    private val chatRepo: ChatRepository = ChatRepository(),
    private val authRepo: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(ConversationUiState())
    val uiState: StateFlow<ConversationUiState> = _uiState.asStateFlow()

    fun initChat(chatId: String, title: String, avatarUrl: String?) {
        val uid = authRepo.currentUserId ?: ""
        // Reset immediately to avoid displaying stale messages
        _uiState.value = ConversationUiState(
            chatId = chatId,
            title = title,
            avatarUrl = avatarUrl,
            currentUserId = uid,
            isLoading = true
        )

        viewModelScope.launch {
            // Asynchronously resolve full chat details (peer user info)
            val fullChat = chatRepo.getChat(chatId)
            if (fullChat != null) {
                _uiState.value = _uiState.value.copy(
                    title = fullChat.displayTitle,
                    avatarUrl = fullChat.displayAvatar
                )
            }

            val messages = chatRepo.getMessages(chatId)
            _uiState.value = _uiState.value.copy(
                messages = messages,
                isLoading = false
            )
            chatRepo.markChatRead(chatId)
        }
    }

    fun setReply(message: OmiMessage) {
        _uiState.value = _uiState.value.copy(
            replyTo = ReplyInfo(
                id = message.id,
                text = message.text.ifBlank { "Attachment" },
                senderName = message.senderName ?: "User"
            )
        )
    }

    fun cancelReply() {
        _uiState.value = _uiState.value.copy(replyTo = null)
    }

    fun sendTextMessage(text: String) {
        val chatId = _uiState.value.chatId
        val reply = _uiState.value.replyTo
        if (chatId.isBlank() || text.isBlank()) return

        // Optimistic message
        val tempId = UUID.randomUUID().toString()
        val optimisticMessage = OmiMessage(
            id = tempId,
            chatId = chatId,
            senderId = _uiState.value.currentUserId,
            senderName = "Me",
            text = text,
            replyTo = reply,
            createdAt = java.time.Instant.now().toString(),
            isSending = true
        )

        _uiState.value = _uiState.value.copy(
            messages = listOf(optimisticMessage) + _uiState.value.messages,
            replyTo = null
        )

        viewModelScope.launch {
            val result = chatRepo.sendMessage(
                chatId = chatId,
                text = text,
                replyToId = reply?.id,
                replyToText = reply?.text,
                replyToSender = reply?.senderName
            )

            result.onSuccess { sentMsg ->
                val updated = _uiState.value.messages.map {
                    if (it.id == tempId) sentMsg else it
                }
                _uiState.value = _uiState.value.copy(messages = updated)
            }.onFailure {
                val updated = _uiState.value.messages.map {
                    if (it.id == tempId) it.copy(isSending = false, isFailed = true) else it
                }
                _uiState.value = _uiState.value.copy(messages = updated)
            }
        }
    }

    fun sendImageAttachment(fileName: String, data: ByteArray) {
        val chatId = _uiState.value.chatId
        if (chatId.isBlank()) return

        viewModelScope.launch {
            val uploadResult = chatRepo.uploadAttachment(chatId, fileName, data)
            uploadResult.onSuccess { url ->
                chatRepo.sendMessage(
                    chatId = chatId,
                    text = "",
                    kind = MessageKind.IMAGE,
                    attachmentUrl = url,
                    attachmentName = fileName,
                    attachmentSize = data.size.toLong()
                )
                val messages = chatRepo.getMessages(chatId)
                _uiState.value = _uiState.value.copy(messages = messages)
            }
        }
    }
}
