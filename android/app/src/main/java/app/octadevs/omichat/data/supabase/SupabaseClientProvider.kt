package app.octadevs.omichat.data.supabase

import app.octadevs.omichat.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.storage.storage
import io.ktor.client.engine.okhttp.OkHttp
import kotlin.time.Duration.Companion.seconds

object SupabaseClientProvider {

    val client: SupabaseClient by lazy {
        val url = BuildConfig.SUPABASE_URL.ifEmpty { "https://lfbrsfenvhgwzaawuasw.supabase.co" }
        val anonKey = BuildConfig.SUPABASE_ANON_KEY

        createSupabaseClient(
            supabaseUrl = url,
            supabaseKey = anonKey
        ) {
            httpEngine = OkHttp.create()

            install(Auth) {
                alwaysAutoRefresh = true
                autoLoadFromStorage = true
            }

            install(Postgrest)

            install(Realtime) {
                reconnectDelay = 3.seconds
            }

            install(Storage)
        }
    }

    val auth: Auth get() = client.auth
    val postgrest: Postgrest get() = client.postgrest
    val realtime: Realtime get() = client.realtime
    val storage: Storage get() = client.storage
}
