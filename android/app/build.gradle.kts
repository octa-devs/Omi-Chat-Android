import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

/*
 * Release signing is deliberately optional.
 *
 * A fresh clone should be able to produce an installable APK before anyone has
 * set up signing, so the release variant falls back to the debug key when no
 * keystore is present. Drop a keystore.properties beside this file (see
 * keystore.properties.example) and both local and CI builds switch to the real
 * key. CI supplies the same file from repository secrets - see
 * .github/workflows/release.yml.
 */
val keystoreProperties = Properties().apply {
    val file = rootProject.file("keystore.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
val hasReleaseKeystore = keystoreProperties.getProperty("storeFile") != null

val webOrigin =
    (project.findProperty("omiOrigin")?.toString() ?: "https://omichatapp.octadevs.fun").trimEnd('/')
val oauthHost =
    project.findProperty("omiOauthHost")?.toString() ?: "lfbrsfenvhgwzaawuasw.supabase.co"

android {
    // "fun" is a reserved Kotlin keyword, so it cannot appear in a package
    // declaration and therefore not in the namespace either. applicationId
    // below keeps the fun.octadevs identity, because that is the installed
    // package name and changing it after release would ship a different app.
    namespace = "app.octadevs.omichat"
    compileSdk = 35

    defaultConfig {
        applicationId = "fun.octadevs.omichat"
        // 24 is the oldest release with a non-negligible installed base and the
        // first where WebView is updated via the Play Store rather than the OS,
        // which matters because this app is entirely a WebView.
        minSdk = 24
        targetSdk = 35

        versionCode = (project.findProperty("omiVersionCode")?.toString() ?: "1").toInt()
        versionName = project.findProperty("omiVersionName")?.toString() ?: "1.0.0"

        buildConfigField("String", "WEB_ORIGIN", "\"$webOrigin\"")
        buildConfigField("String", "OAUTH_HOST", "\"$oauthHost\"")
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                enableV1Signing = true
                enableV2Signing = true
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            signingConfig =
                if (hasReleaseKeystore) signingConfigs.getByName("release")
                else signingConfigs.getByName("debug")
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }

    lint {
        // Builds run in CI without a local Android SDK, so lint is not run as
        // part of assembleRelease. Run ./gradlew :app:lint after touching the
        // manifest, the network security config or any resource.
        checkReleaseBuilds = false
    }

    packaging {
        resources.excludes += setOf(
            "/META-INF/{AL2.0,LGPL2.1}",
            "/META-INF/DEPENDENCIES",
            "META-INF/*.version",
        )
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.3")

    // WebSettingsCompat / WebViewFeature. Used to query feature support at
    // runtime instead of guessing from Build.VERSION, which matters because
    // OEM WebViews lag the platform on older Android versions.
    implementation("androidx.webkit:webkit:1.12.1")

    // Themed splash screen. Without this the launcher hands off to a blank
    // window while the WebView spins up, which reads as a slow cold start.
    implementation("androidx.core:core-splashscreen:1.0.1")

    // Smooth native pull-to-refresh
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
}