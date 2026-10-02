package app.octadevs.omichat.ui.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.octadevs.omichat.data.model.MessageKind
import app.octadevs.omichat.data.model.OmiMessage
import app.octadevs.omichat.ui.theme.OmiBrand100
import app.octadevs.omichat.ui.theme.OmiBrand700
import app.octadevs.omichat.ui.theme.OmiBubbleOwnGradient
import app.octadevs.omichat.ui.theme.OmiLine
import app.octadevs.omichat.ui.theme.OmiMintLight
import app.octadevs.omichat.ui.theme.OmiRust
import app.octadevs.omichat.ui.theme.OmiSurface
import app.octadevs.omichat.ui.theme.OmiTextMuted
import app.octadevs.omichat.ui.theme.OmiTextPrimary
import app.octadevs.omichat.ui.theme.OmiTextSecondary
import coil.compose.AsyncImage

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MessageBubbleItem(
    message: OmiMessage,
    isMine: Boolean,
    showSenderName: Boolean = false,
    tail: Boolean = true,
    onReply: (OmiMessage) -> Unit = {},
    onLongClick: (OmiMessage) -> Unit = {}
) {
    if (message.deleted) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 3.dp),
            horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start
        ) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFFF1F3F9))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "This message was deleted",
                    style = MaterialTheme.typography.bodySmall.copy(
                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                        color = OmiTextMuted
                    )
                )
            }
        }
        return
    }

    val bubbleShape = if (isMine) {
        RoundedCornerShape(
            topStart = 20.dp,
            topEnd = 20.dp,
            bottomStart = 20.dp,
            bottomEnd = if (tail) 4.dp else 20.dp
        )
    } else {
        RoundedCornerShape(
            topStart = 20.dp,
            topEnd = 20.dp,
            bottomStart = if (tail) 4.dp else 20.dp,
            bottomEnd = 20.dp
        )
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 2.dp),
        horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = 300.dp)
                .shadow(if (isMine) 2.dp else 1.dp, bubbleShape, clip = false)
                .clip(bubbleShape)
                .then(
                    if (isMine) {
                        Modifier.background(OmiBubbleOwnGradient)
                    } else {
                        Modifier.background(OmiSurface)
                    }
                )
                .combinedClickable(
                    onClick = {},
                    onLongClick = { onLongClick(message) }
                )
                .padding(horizontal = 14.dp, vertical = 9.dp)
        ) {
            Column {
                // Sender name in group chat
                if (!isMine && showSenderName && !message.senderName.isNullOrBlank()) {
                    Text(
                        text = message.senderName,
                        style = MaterialTheme.typography.labelMedium.copy(
                            color = OmiBrand700,
                            fontWeight = FontWeight.SemiBold
                        ),
                        modifier = Modifier.padding(bottom = 2.dp)
                    )
                }

                // Reply preview
                message.replyTo?.let { reply ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 6.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(if (isMine) Color(0x33FFFFFF) else OmiBrand100)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Column {
                            Text(
                                text = reply.senderName,
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = if (isMine) Color.White else OmiBrand700
                                )
                            )
                            Text(
                                text = reply.text,
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = if (isMine) Color.White.copy(alpha = 0.8f) else OmiTextSecondary
                                ),
                                maxLines = 1
                            )
                        }
                    }
                }

                // Image Attachment
                if (message.kind == MessageKind.IMAGE && !message.attachmentUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = message.attachmentUrl,
                        contentDescription = "Image attachment",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                            .clip(RoundedCornerShape(12.dp)),
                        contentScale = ContentScale.Crop
                    )
                    if (message.text.isNotBlank()) {
                        Spacer(modifier = Modifier.height(6.dp))
                    }
                }

                // Text body
                if (message.text.isNotBlank()) {
                    Text(
                        text = message.text,
                        style = MaterialTheme.typography.bodyLarge.copy(
                            color = if (isMine) Color.White else OmiTextPrimary,
                            fontSize = 15.sp,
                            lineHeight = 21.sp
                        )
                    )
                }

                // Timestamp & Delivery status
                Row(
                    modifier = Modifier
                        .align(Alignment.End)
                        .padding(top = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = formatTime(message.createdAt),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 10.sp,
                            color = if (isMine) Color.White.copy(alpha = 0.7f) else OmiTextMuted
                        )
                    )

                    if (isMine) {
                        Spacer(modifier = Modifier.width(4.dp))
                        when {
                            message.isSending -> {
                                Icon(
                                    imageVector = Icons.Default.AccessTime,
                                    contentDescription = "Sending",
                                    tint = Color.White.copy(alpha = 0.6f),
                                    modifier = Modifier.size(11.dp)
                                )
                            }
                            message.isFailed -> {
                                Icon(
                                    imageVector = Icons.Default.ErrorOutline,
                                    contentDescription = "Failed",
                                    tint = OmiRust,
                                    modifier = Modifier.size(11.dp)
                                )
                            }
                            else -> {
                                Icon(
                                    imageVector = Icons.Default.DoneAll,
                                    contentDescription = "Sent",
                                    tint = OmiMintLight,
                                    modifier = Modifier.size(13.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun formatTime(isoString: String): String {
    if (isoString.isBlank()) return ""
    return try {
        // e.g. 2026-10-02T13:45:00Z -> 1:45 PM
        val parts = isoString.substringAfter("T").substringBefore(".").substringBefore("Z").split(":")
        val hour = parts.getOrNull(0)?.toIntOrNull() ?: return ""
        val min = parts.getOrNull(1)?.toIntOrNull() ?: 0
        val amPm = if (hour >= 12) "PM" else "AM"
        val displayHour = if (hour % 12 == 0) 12 else hour % 12
        "%d:%02d %s".format(displayHour, min, amPm)
    } catch (e: Exception) {
        ""
    }
}
