package app.octadevs.omichat

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import app.octadevs.omichat.ui.navigation.OmiNavGraph
import app.octadevs.omichat.ui.theme.OmiChatTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)

        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(
                android.R.color.transparent,
                android.R.color.transparent
            ),
            navigationBarStyle = SystemBarStyle.light(
                android.R.color.transparent,
                android.R.color.transparent
            )
        )

        setContent {
            OmiChatTheme {
                OmiNavGraph()
            }
        }
    }
}