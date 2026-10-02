package app.octadevs.omichat.data.supabase

import app.octadevs.omichat.data.model.OmiUser
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.auth.providers.builtin.IDToken
import io.github.jan.supabase.auth.status.SessionStatus
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.Flow
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class AuthRepository {

    private val auth = SupabaseClientProvider.auth
    private val postgrest = SupabaseClientProvider.postgrest

    val sessionStatus: Flow<SessionStatus> = auth.sessionStatus

    val currentUserId: String?
        get() = auth.currentSessionOrNull()?.user?.id

    suspend fun signIn(emailInput: String, passwordInput: String): Result<Unit> = runCatching {
        auth.signInWith(Email) {
            email = emailInput.trim()
            password = passwordInput
        }
    }

    suspend fun signUp(emailInput: String, passwordInput: String, displayNameInput: String): Result<Unit> = runCatching {
        auth.signUpWith(Email) {
            email = emailInput.trim()
            password = passwordInput
            data = buildJsonObject {
                put("display_name", displayNameInput.trim())
                put("username", emailInput.substringBefore("@").lowercase().replace(".", "_"))
            }
        }
    }

    suspend fun signInWithGoogleIdToken(idToken: String, rawNonce: String? = null): Result<Unit> = runCatching {
        auth.signInWith(IDToken) {
            this.idToken = idToken
            this.provider = Google
            this.nonce = rawNonce
        }
    }

    suspend fun signOut(): Result<Unit> = runCatching {
        auth.signOut()
    }

    suspend fun getCurrentProfile(): OmiUser? {
        val uid = currentUserId ?: return null
        return runCatching {
            postgrest.from("profiles")
                .select {
                    filter {
                        eq("id", uid)
                    }
                }
                .decodeSingleOrNull<OmiUser>()
        }.getOrNull()
    }

    suspend fun updateProfile(displayName: String, bio: String? = null, statusText: String? = null): Result<Unit> = runCatching {
        val uid = currentUserId ?: throw IllegalStateException("Not signed in")
        postgrest.from("profiles")
            .update(
                buildJsonObject {
                    put("display_name", displayName)
                    bio?.let { put("bio", it) }
                    statusText?.let { put("status_text", it) }
                }
            ) {
                filter {
                    eq("id", uid)
                }
            }
    }
}
