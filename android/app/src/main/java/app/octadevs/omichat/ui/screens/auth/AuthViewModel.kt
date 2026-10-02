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
                    error = formatAuthError(e)
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
                    error = formatAuthError(e)
                )
            }
        }
    }

    private fun formatAuthError(e: Throwable): String {
        val msg = e.message ?: return "Authentication failed. Please try again."
        return when {
            msg.contains("invalid_credentials", ignoreCase = true) || msg.contains("Invalid login credentials", ignoreCase = true) ->
                "Incorrect email or password. Please try again."
            msg.contains("User already registered", ignoreCase = true) || msg.contains("user_already_exists", ignoreCase = true) ->
                "An account with this email already exists."
            msg.contains("Unsupported provider", ignoreCase = true) ->
                "Google sign-in is not enabled in the Supabase dashboard."
            msg.contains("No API key found", ignoreCase = true) ->
                "Supabase API key is missing or invalid."
            msg.contains("Password should be at least", ignoreCase = true) ->
                "Password must be at least 6 characters."
            msg.contains("Unable to resolve host", ignoreCase = true) || msg.contains("ConnectException", ignoreCase = true) ->
                "No internet connection. Please check your network."
            else -> {
                val jsonMsgRegex = """"msg"\s*:\s*"([^"]+)"""".toRegex()
                jsonMsgRegex.find(msg)?.groupValues?.get(1) ?: (e.localizedMessage ?: "Authentication failed")
            }
        }
    }
}
