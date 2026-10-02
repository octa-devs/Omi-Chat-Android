package app.octadevs.omichat.ui.screens.newchat

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import app.octadevs.omichat.data.model.OmiChat
import app.octadevs.omichat.data.model.OmiUser
import app.octadevs.omichat.ui.components.OmiAvatar
import app.octadevs.omichat.ui.theme.OmiBackground
import app.octadevs.omichat.ui.theme.OmiBrand500
import app.octadevs.omichat.ui.theme.OmiLine
import app.octadevs.omichat.ui.theme.OmiSurface
import app.octadevs.omichat.ui.theme.OmiTextMuted
import app.octadevs.omichat.ui.theme.OmiTextPrimary
import app.octadevs.omichat.ui.theme.OmiTextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewChatScreen(
    onBack: () -> Unit,
    onChatCreated: (chat: OmiChat) -> Unit,
    viewModel: NewChatViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.createdChat) {
        state.createdChat?.let { chat ->
            onChatCreated(chat)
        }
    }

    Scaffold(
        containerColor = OmiBackground,
        topBar = {
            TopAppBar(
                modifier = Modifier.statusBarsPadding(),
                title = {
                    Text(
                        text = "New Conversation",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = OmiTextPrimary
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = OmiTextPrimary
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = OmiSurface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(OmiBackground)
        ) {
            // Search Input
            OutlinedTextField(
                value = state.query,
                onValueChange = viewModel::onQueryChange,
                placeholder = { Text("Search by username or name…", color = OmiTextMuted) },
                leadingIcon = {
                    Icon(Icons.Default.Search, contentDescription = null, tint = OmiTextMuted)
                },
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = OmiBrand500,
                    unfocusedBorderColor = OmiLine,
                    focusedContainerColor = OmiSurface,
                    unfocusedContainerColor = OmiSurface
                )
            )

            if (state.isSearching || state.isCreating) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = OmiBrand500)
                }
            } else if (state.searchResults.isEmpty() && state.query.isNotBlank()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No users found for “${state.query}”",
                        style = MaterialTheme.typography.bodyMedium.copy(color = OmiTextMuted)
                    )
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(
                        items = state.searchResults,
                        key = { it.id }
                    ) { user ->
                        UserSearchItem(
                            user = user,
                            onClick = { viewModel.startDirectChat(user) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun UserSearchItem(
    user: OmiUser,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        OmiAvatar(
            name = user.name,
            avatarUrl = user.avatarUrl,
            size = 48.dp
        )

        Spacer(modifier = Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = user.name,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                    color = OmiTextPrimary
                )
            )
            Text(
                text = "@${user.username.ifBlank { "user" }}",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = OmiTextSecondary
                )
            )
        }
    }
}
