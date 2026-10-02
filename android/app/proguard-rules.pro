# Kotlinx Serialization
-keepattributes *Annotation*,InnerClasses
-dontnote kotlinx.serialization.SerializationKt
-keepclassmembers class * {
    *** Companion;
}
-keepclasseswithmembers class * {
    kotlinx.serialization.KSerializer serializer(...);
}
-keepclassmembers class * implements kotlinx.serialization.KSerializer {
    *** Companion;
}

# Supabase & Ktor / OkHttp
-dontwarn io.github.jan.supabase.**
-dontwarn io.ktor.**
-dontwarn okhttp3.**
-dontwarn okio.**