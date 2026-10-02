package app.octadevs.omichat.ui.screens.inbox

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.octadevs.omichat.data.model.OmiChat
import app.octadevs.omichat.data.model.OmiUser
import app.octadevs.omichat.data.supabase.AuthRepository
import app.octadevs.omichat.data.supabase.ChatRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class InboxUiState(
    val chats: List<OmiChat> = emptyList(),
    val filteredChats: List<OmiChat> = emptyList(),
    val searchQuery: String = "",
    val currentUser: OmiUser? = null,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false
)

class InboxViewModel(
    private val chatRepo: ChatRepository = ChatRepository(),
    private val authRepo: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(InboxUiState())
    val uiState: StateFlow<InboxUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        _uiState.value = _uiState.value.copy(isLoading = true)
        viewModelScope.launch {
            val user = authRepo.getCurrentProfile()
            val chats = chatRepo.getInbox()
            _uiState.value = _uiState.value.copy(
                currentUser = user,
                chats = chats,
                filteredChats = filterChats(chats, _uiState.value.searchQuery),
                isLoading = false
            )
        }
    }

    fun refresh() {
        _uiState.value = _uiState.value.copy(isRefreshing = true)
        viewModelScope.launch {
            val chats = chatRepo.getInbox()
            _uiState.value = _uiState.value.copy(
                chats = chats,
                filteredChats = filterChats(chats, _uiState.value.searchQuery),
                isRefreshing = false
            )
        }
    }

    fun onSearchQueryChange(query: String) {
        _uiState.value = _uiState.value.copy(
            searchQuery = query,
            filteredChats = filterChats(_uiState.value.chats, query)
        )
    }

    private fun filterChats(chats: List<OmiChat>, query: String): List<OmiChat> {
        if (query.isBlank()) return chats
        val q = query.trim().lowercase()
        return chats.filter {
            (it.title ?: "").lowercase().contains(q) ||
            (it.lastMessage?.text ?: "").lowercase().contains(q)
        }
    }
}
