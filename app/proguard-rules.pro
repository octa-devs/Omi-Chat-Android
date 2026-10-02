# This app has no reflection, no serialisable models and no dynamic class
# loading, so the default android-optimize rules already cover it. These are the
# only surfaces anything outside this module could legitimately reach.

# A page can reach a @JavascriptInterface object if the site ever adds a bridge.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# WebView callbacks are invoked from native code by name.
-keepclassmembers class fun.octadevs.omichat.** {
    public void onPageFinished(...);
    public void onReceivedError(...);
    public void onPermissionRequest(...);
}

# Silence warnings for optional Play-services classes referenced by WebView.
-dontwarn com.google.android.gms.**
-dontwarn org.apache.http.**