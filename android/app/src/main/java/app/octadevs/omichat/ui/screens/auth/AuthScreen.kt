package app.octadevs.omichat.ui.screens.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.lifecycle.viewmodel.compose.viewModel
import app.octadevs.omichat.BuildConfig
import app.octadevs.omichat.ui.components.GlassCard
import app.octadevs.omichat.ui.theme.OmiBackground
import app.octadevs.omichat.ui.theme.OmiBrand500
import app.octadevs.omichat.ui.theme.OmiBrand600
import app.octadevs.omichat.ui.theme.OmiLine
import app.octadevs.omichat.ui.theme.OmiRust
import app.octadevs.omichat.ui.theme.OmiSurface
import app.octadevs.omichat.ui.theme.OmiSurface2
import app.octadevs.omichat.ui.theme.OmiTextMuted
import app.octadevs.omichat.ui.theme.OmiTextPrimary
import app.octadevs.omichat.ui.theme.OmiTextSecondary
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch

@Composable
fun AuthScreen(
    onAuthSuccess: () -> Unit,
    viewModel: AuthViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val credentialManager = remember { CredentialManager.create(context) }

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            onAuthSuccess()
        }
    }

    fun launchGoogleSignIn() {
        coroutineScope.launch {
            try {
                val googleIdOption = GetGoogleIdOption.Builder()
                    .setFilterByAuthorizedAccounts(false)
                    .setServerClientId(BuildConfig.GOOGLE_CLIENT_ID)
                    .setAutoSelectEnabled(false)
                    .build()

                val request = GetCredentialRequest.Builder()
                    .addCredentialOption(googleIdOption)
                    .build()

                val result = credentialManager.getCredential(
                    request = request,
                    context = context
                )

                val credential = result.credential
                if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                    val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                    val idToken = googleIdTokenCredential.idToken
                    viewModel.signInWithGoogleIdToken(idToken)
                }
            } catch (e: Exception) {
                // User cancelled or error
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(OmiBackground)
            .imePadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Brand Logo
            Box(
                modifier = Modifier
                    .size(68.dp)
                    .clip(CircleShape)
                    .background(OmiBrand500),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "O",
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Omi Chat",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = OmiTextPrimary
                )
            )

            Text(
                text = if (state.isSignIn) "Welcome back! Sign in to continue." else "Create an account to start chatting.",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = OmiTextSecondary,
                    textAlign = TextAlign.Center
                ),
                modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
            )

            // Auth Card
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Google Sign In Button
                    OutlinedButton(
                        onClick = { launchGoogleSignIn() },
                        enabled = !state.isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            containerColor = OmiSurface,
                            contentColor = OmiTextPrimary
                        ),
                        border = BorderStroke(1.dp, OmiLine)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            GoogleLogo(modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "Continue with Google",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp
                            )
                        }
                    }

                    // Divider
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        HorizontalDivider(modifier = Modifier.weight(1f), color = OmiLine)
                        Text(
                            text = "or",
                            modifier = Modifier.padding(horizontal = 10.dp),
                            style = MaterialTheme.typography.bodySmall.copy(color = OmiTextMuted)
                        )
                        HorizontalDivider(modifier = Modifier.weight(1f), color = OmiLine)
                    }

                    AnimatedVisibility(visible = !state.isSignIn) {
                        Column {
                            OutlinedTextField(
                                value = state.displayName,
                                onValueChange = viewModel::onDisplayNameChange,
                                label = { Text("Display Name") },
                                leadingIcon = {
                                    Icon(Icons.Default.Person, contentDescription = null, tint = OmiTextMuted)
                                },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = OmiBrand500,
                                    unfocusedBorderColor = OmiLine,
                                    focusedContainerColor = OmiSurface2,
                                    unfocusedContainerColor = OmiSurface2
                                ),
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                            )
                            Spacer(modifier = Modifier.height(14.dp))
                        }
                    }

                    OutlinedTextField(
                        value = state.email,
                        onValueChange = viewModel::onEmailChange,
                        label = { Text("Email address") },
                        leadingIcon = {
                            Icon(Icons.Default.Email, contentDescription = null, tint = OmiTextMuted)
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = OmiBrand500,
                            unfocusedBorderColor = OmiLine,
                            focusedContainerColor = OmiSurface2,
                            unfocusedContainerColor = OmiSurface2
                        )
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedTextField(
                        value = state.password,
                        onValueChange = viewModel::onPasswordChange,
                        label = { Text("Password") },
                        leadingIcon = {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = OmiTextMuted)
                        },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                viewModel.submit()
                            }
                        ),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = OmiBrand500,
                            unfocusedBorderColor = OmiLine,
                            focusedContainerColor = OmiSurface2,
                            unfocusedContainerColor = OmiSurface2
                        )
                    )

                    // Error message
                    if (state.error != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = state.error ?: "",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = OmiRust,
                                textAlign = TextAlign.Center
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Submit Button
                    Button(
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.submit()
                        },
                        enabled = !state.isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = OmiBrand500,
                            contentColor = Color.White
                        )
                    ) {
                        if (state.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                text = if (state.isSignIn) "Sign In" else "Create Account",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Toggle Mode Button
            TextButton(
                onClick = viewModel::toggleMode,
                modifier = Modifier.padding(top = 4.dp)
            ) {
                Text(
                    text = if (state.isSignIn) "Don't have an account? Sign Up" else "Already have an account? Sign In",
                    color = OmiBrand600,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun GoogleLogo(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val cX = w / 2f
        val cY = h / 2f

        // Google 'G' colors
        drawCircle(color = Color(0xFF4285F4), radius = w * 0.45f, center = Offset(cX, cY))
        drawCircle(color = Color.White, radius = w * 0.3f, center = Offset(cX, cY))
        drawRect(
            color = Color(0xFF4285F4),
            topLeft = Offset(cX, cY - h * 0.12f),
            size = androidx.compose.ui.geometry.Size(w * 0.45f, h * 0.24f)
        )
    }
}
