package app.octadevs.omichat.ui.navigation

import android.net.Uri

sealed class Screen(val route: String) {
    data object Auth : Screen("auth")
    data object Inbox : Screen("inbox")
    data object NewChat : Screen("new_chat")
    data object Settings : Screen("settings")

    data object Conversation : Screen("conversation/{chatId}?title={title}&avatar={avatar}") {
        fun createRoute(chatId: String, title: String, avatarUrl: String? = null): String {
            val encodedTitle = Uri.encode(title)
            val encodedAvatar = Uri.encode(avatarUrl ?: "")
            return "conversation/$chatId?title=$encodedTitle&avatar=$encodedAvatar"
        }
    }
}
