package app.octadevs.omichat.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.octadevs.omichat.data.supabase.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val isSignIn: Boolean = true,
    val email: String = "",
    val password: String = "",
    val displayName: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val isSuccess: Boolean = false
)

class AuthViewModel(
    private val authRepo: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun toggleMode() {
        _uiState.value = _uiState.value.copy(
            isSignIn = !_uiState.value.isSignIn,
            error = null
        )
    }

    fun onEmailChange(v: String) { _uiState.value = _uiState.value.copy(email = v, error = null) }
    fun onPasswordChange(v: String) { _uiState.value = _uiState.value.copy(password = v, error = null) }
    fun onDisplayNameChange(v: String) { _uiState.value = _uiState.value.copy(displayName = v, error = null) }

    fun submit() {
        val state = _uiState.value
        if (state.email.isBlank() || state.password.isBlank()) {
            _uiState.value = state.copy(error = "Please fill in all fields")
            return
        }

        _uiState.value = state.copy(isLoading = true, error = null)

        viewModelScope.launch {
            val result = if (state.isSignIn) {
                authRepo.signIn(state.email, state.password)
            } else {
                authRepo.signUp(state.email, state.password, state.displayName.ifBlank { state.email.substringBefore("@") })
            }

            result.onSuccess {
                _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.localizedMessage ?: "Authentication failed"
                )
            }
        }
    }

    fun signInWithGoogleIdToken(idToken: String, nonce: String? = null) {
        _uiState.value = _uiState.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            val result = authRepo.signInWithGoogleIdToken(idToken, nonce)
            result.onSuccess {
                _uiState.value = _uiState.value.copy(isLoading = false, isSuccess = true)
            }.onFailure { e ->
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.localizedMessage ?: "Google Sign-In failed"
                )
            }
        }
    }
}
