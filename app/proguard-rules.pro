# This app has no reflection, no serialisable models and no dynamic class
# loading, so the default android-optimize rules already cover it. The
# WebViewClient and WebChromeClient instances are anonymous objects created
# directly in code, so R8 keeps them without help.

# A page can reach a @JavascriptInterface object if the site ever adds a bridge.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Optional Play-services classes that WebView may reference reflectively.
# androidx.webkit calls into com.google.android.webkit, the WebView support
# library, which is an optional component that may be absent on a device.
-dontwarn com.google.android.gms.**
-dontwarn com.google.android.webkit.**
-dontwarn org.apache.http.**