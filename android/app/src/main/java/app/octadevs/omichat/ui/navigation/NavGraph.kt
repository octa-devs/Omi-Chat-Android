package app.octadevs.omichat.ui.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import app.octadevs.omichat.data.supabase.AuthRepository
import app.octadevs.omichat.ui.screens.auth.AuthScreen
import app.octadevs.omichat.ui.screens.chat.ConversationScreen
import app.octadevs.omichat.ui.screens.inbox.InboxScreen
import app.octadevs.omichat.ui.screens.newchat.NewChatScreen
import app.octadevs.omichat.ui.screens.settings.SettingsScreen
import io.github.jan.supabase.auth.status.SessionStatus

@Composable
fun OmiNavGraph(
    authRepo: AuthRepository = remember { AuthRepository() }
) {
    val navController = rememberNavController()
    val sessionStatus by authRepo.sessionStatus.collectAsState(initial = SessionStatus.Initializing)

    val startDestination = if (authRepo.currentUserId != null) {
        Screen.Inbox.route
    } else {
        Screen.Auth.route
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
        enterTransition = {
            slideIntoContainer(
                AnimatedContentTransitionScope.SlideDirection.Start,
                animationSpec = tween(220, easing = FastOutSlowInEasing)
            ) + fadeIn(animationSpec = tween(220))
        },
        exitTransition = {
            slideOutOfContainer(
                AnimatedContentTransitionScope.SlideDirection.Start,
                animationSpec = tween(220, easing = FastOutSlowInEasing)
            ) + fadeOut(animationSpec = tween(220))
        },
        popEnterTransition = {
            slideIntoContainer(
                AnimatedContentTransitionScope.SlideDirection.End,
                animationSpec = tween(220, easing = FastOutSlowInEasing)
            ) + fadeIn(animationSpec = tween(220))
        },
        popExitTransition = {
            slideOutOfContainer(
                AnimatedContentTransitionScope.SlideDirection.End,
                animationSpec = tween(220, easing = FastOutSlowInEasing)
            ) + fadeOut(animationSpec = tween(220))
        }
    ) {
        composable(Screen.Auth.route) {
            AuthScreen(
                onAuthSuccess = {
                    navController.navigate(Screen.Inbox.route) {
                        popUpTo(Screen.Auth.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Inbox.route) {
            InboxScreen(
                onChatClick = { chatId, title, avatarUrl ->
                    navController.navigate(
                        Screen.Conversation.createRoute(chatId, title, avatarUrl)
                    )
                },
                onNewChatClick = {
                    navController.navigate(Screen.NewChat.route)
                },
                onSettingsClick = {
                    navController.navigate(Screen.Settings.route)
                }
            )
        }

        composable(
            route = Screen.Conversation.route,
            arguments = listOf(
                navArgument("chatId") { type = NavType.StringType },
                navArgument("title") { type = NavType.StringType; defaultValue = "" },
                navArgument("avatar") { type = NavType.StringType; defaultValue = "" }
            )
        ) { backStackEntry ->
            val chatId = backStackEntry.arguments?.getString("chatId") ?: ""
            val title = backStackEntry.arguments?.getString("title") ?: ""
            val avatar = backStackEntry.arguments?.getString("avatar")?.takeIf { it.isNotBlank() }

            ConversationScreen(
                chatId = chatId,
                title = title,
                avatarUrl = avatar,
                onBack = { navController.popBackStack() }
            )
        }

        composable(Screen.NewChat.route) {
            NewChatScreen(
                onBack = { navController.popBackStack() },
                onChatCreated = { chat ->
                    navController.navigate(
                        Screen.Conversation.createRoute(chat.id, chat.displayTitle, chat.displayAvatar)
                    ) {
                        popUpTo(Screen.NewChat.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onSignOutSuccess = {
                    navController.navigate(Screen.Auth.route) {
                        popUpTo(Screen.Inbox.route) { inclusive = true }
                    }
                }
            )
        }
    }
}
