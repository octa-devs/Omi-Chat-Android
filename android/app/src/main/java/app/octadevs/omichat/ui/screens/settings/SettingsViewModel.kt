package app.octadevs.omichat.ui.screens.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.octadevs.omichat.data.model.OmiUser
import app.octadevs.omichat.data.supabase.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SettingsUiState(
    val currentUser: OmiUser? = null,
    val isUpdating: Boolean = false,
    val isSignedOut: Boolean = false,
    val error: String? = null
)

class SettingsViewModel(
    private val authRepo: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            val profile = authRepo.getCurrentProfile()
            _uiState.value = _uiState.value.copy(currentUser = profile)
        }
    }

    fun updateProfile(displayName: String, bio: String) {
        _uiState.value = _uiState.value.copy(isUpdating = true, error = null)
        viewModelScope.launch {
            val result = authRepo.updateProfile(displayName, bio)
            result.onSuccess {
                loadProfile()
                _uiState.value = _uiState.value.copy(isUpdating = false)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(
                    isUpdating = false,
                    error = e.localizedMessage ?: "Failed to update profile"
                )
            }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            authRepo.signOut()
            _uiState.value = _uiState.value.copy(isSignedOut = true)
        }
    }
}
