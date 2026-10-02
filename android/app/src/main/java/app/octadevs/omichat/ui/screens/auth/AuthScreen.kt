package app.octadevs.omichat.ui.screens.auth

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import app.octadevs.omichat.ui.components.GlassCard
import app.octadevs.omichat.ui.theme.OmiBackground
import app.octadevs.omichat.ui.theme.OmiBrand100
import app.octadevs.omichat.ui.theme.OmiBrand500
import app.octadevs.omichat.ui.theme.OmiBrand600
import app.octadevs.omichat.ui.theme.OmiBrand700
import app.octadevs.omichat.ui.theme.OmiLine
import app.octadevs.omichat.ui.theme.OmiRust
import app.octadevs.omichat.ui.theme.OmiSurface
import app.octadevs.omichat.ui.theme.OmiSurface2
import app.octadevs.omichat.ui.theme.OmiTextMuted
import app.octadevs.omichat.ui.theme.OmiTextPrimary
import app.octadevs.omichat.ui.theme.OmiTextSecondary

@Composable
fun AuthScreen(
    onAuthSuccess: () -> Unit,
    viewModel: AuthViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    LaunchedEffect(state.isSuccess) {
        if (state.isSuccess) {
            onAuthSuccess()
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
                modifier = Modifier.padding(top = 4.dp, bottom = 28.dp)
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

                    Spacer(modifier = Modifier.height(20.dp))

                    // Submit Button
                    Button(
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.submit()
                        },
                        enabled = !state.isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
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
                                fontSize = 16.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

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
