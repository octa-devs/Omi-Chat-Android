package app.octadevs.omichat.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.octadevs.omichat.data.model.PresenceState
import app.octadevs.omichat.ui.theme.OmiBrand300
import app.octadevs.omichat.ui.theme.OmiBrand600
import app.octadevs.omichat.ui.theme.OmiMint
import app.octadevs.omichat.ui.theme.OmiSurface
import coil.compose.AsyncImage

@Composable
fun OmiAvatar(
    name: String,
    avatarUrl: String? = null,
    presence: PresenceState = PresenceState.OFFLINE,
    size: Dp = 48.dp,
    showPresence: Boolean = false,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.size(size),
        contentAlignment = Alignment.Center
    ) {
        if (!avatarUrl.isNullOrBlank()) {
            AsyncImage(
                model = avatarUrl,
                contentDescription = name,
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )
        } else {
            // Generate initials and consistent gradient
            val initial = name.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
            val gradient = getAvatarGradient(name)

            Box(
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape)
                    .background(gradient),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = initial,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = (size.value * 0.42).sp
                )
            }
        }

        if (showPresence && presence == PresenceState.ONLINE) {
            val dotSize = (size * 0.28f).coerceAtLeast(10.dp)
            Box(
                modifier = Modifier
                    .size(dotSize)
                    .align(Alignment.BottomEnd)
                    .clip(CircleShape)
                    .background(OmiMint)
                    .border(2.dp, OmiSurface, CircleShape)
            )
        }
    }
}

private fun getAvatarGradient(name: String): Brush {
    val hash = kotlin.math.abs(name.hashCode())
    val palettes = listOf(
        listOf(Color(0xFF3670DD), Color(0xFF1C4492)),
        listOf(Color(0xFF0F7F75), Color(0xFF16A394)),
        listOf(Color(0xFF96601A), Color(0xFFEAA14A)),
        listOf(Color(0xFF5A8CEB), Color(0xFF2255B8)),
        listOf(Color(0xFFC21E3C), Color(0xFFF4617A))
    )
    val chosen = palettes[hash % palettes.size]
    return Brush.linearGradient(chosen)
}
