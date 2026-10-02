package app.octadevs.omichat.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = OmiBrand500,
    onPrimary = OmiSurface,
    primaryContainer = OmiBrand100,
    onPrimaryContainer = OmiBrand800,
    secondary = OmiBrand600,
    onSecondary = OmiSurface,
    background = OmiBackground,
    onBackground = OmiTextPrimary,
    surface = OmiSurface,
    onSurface = OmiTextPrimary,
    surfaceVariant = OmiSurface2,
    onSurfaceVariant = OmiTextSecondary,
    outline = OmiLine,
    outlineVariant = OmiLineStrong,
    error = OmiRust,
    onError = OmiSurface
)

private val DarkColorScheme = darkColorScheme(
    primary = OmiBrand400,
    onPrimary = OmiTextPrimary,
    primaryContainer = OmiBrand700,
    onPrimaryContainer = OmiBrand50,
    secondary = OmiBrand300,
    onSecondary = OmiTextPrimary,
    background = OmiTextPrimary,
    onBackground = OmiSurface,
    surface = OmiTextSecondary,
    onSurface = OmiSurface,
    outline = OmiLineStrong,
    error = OmiRust,
    onError = OmiSurface
)

@Composable
fun OmiChatTheme(
    darkTheme: Boolean = false, // Light by default matching Omi design
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
