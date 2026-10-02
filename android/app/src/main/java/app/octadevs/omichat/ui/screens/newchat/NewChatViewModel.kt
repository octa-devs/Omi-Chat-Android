package app.octadevs.omichat.ui.screens.newchat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.octadevs.omichat.data.model.OmiChat
import app.octadevs.omichat.data.model.OmiUser
import app.octadevs.omichat.data.supabase.ChatRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class NewChatUiState(
    val query: String = "",
    val searchResults: List<OmiUser> = emptyList(),
    val isSearching: Boolean = false,
    val createdChat: OmiChat? = null,
    val isCreating: Boolean = false,
    val error: String? = null
)

class NewChatViewModel(
    private val chatRepo: ChatRepository = ChatRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(NewChatUiState())
    val uiState: StateFlow<NewChatUiState> = _uiState.asStateFlow()

    fun onQueryChange(q: String) {
        _uiState.value = _uiState.value.copy(query = q)
        if (q.isBlank()) {
            _uiState.value = _uiState.value.copy(searchResults = emptyList(), isSearching = false)
            return
        }

        _uiState.value = _uiState.value.copy(isSearching = true)
        viewModelScope.launch {
            val results = chatRepo.searchUsers(q)
            _uiState.value = _uiState.value.copy(
                searchResults = results,
                isSearching = false
            )
        }
    }

    fun startDirectChat(user: OmiUser) {
        _uiState.value = _uiState.value.copy(isCreating = true, error = null)
        viewModelScope.launch {
            val result = chatRepo.createDirectChat(user)
            result.onSuccess { chat ->
                _uiState.value = _uiState.value.copy(
                    isCreating = false,
                    createdChat = chat
                )
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(
                    isCreating = false,
                    error = e.localizedMessage ?: "Failed to start chat"
                )
            }
        }
    }
}
