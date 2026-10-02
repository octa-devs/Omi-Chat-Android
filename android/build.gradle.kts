// Plugin versions are declared here and applied in :app. AGP 8.7 requires
// Gradle 8.9+ and JDK 17; see gradle/wrapper/gradle-wrapper.properties.
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.0.21" apply false
}