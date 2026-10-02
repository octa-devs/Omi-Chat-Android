package app.octadevs.omichat

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.isVisible
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature
import app.octadevs.omichat.databinding.ActivityMainBinding

/**
 * Single-Activity WebView host for the Omi Chat web app.
 *
 * Everything the user sees is the website; this class exists to give that
 * website a correct Android shell - a launcher entry that does not flash white,
 * a window whose insets behave, back navigation that matches the browser
 * convention, file attachments, downloads, and WebRTC permissions for calls.
 */
class MainActivity : ComponentActivity() {

    private lateinit var binding: ActivityMainBinding

    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var permissionRequest: PermissionRequest? = null
    private var googleDialog: AlertDialog? = null
    private var lastFailedUrl: String? = null
    private var isPageLoading: Boolean = true

    /** Host of the deployed site. Everything on it stays inside the WebView. */
    private val appHost: String =
        Uri.parse(BuildConfig.WEB_ORIGIN).host ?: "omichat.fun"

    private val fileChooser = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = fileChooserCallback
        fileChooserCallback = null
        callback?.onReceiveValue(
            WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        )
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val request = permissionRequest
        permissionRequest = null
        if (request == null) return@registerForActivityResult

        // Only hand back what was actually granted; anything denied stays denied
        // and the page's own getUserMedia error path runs.
        val approved = request.resources.filter { resource ->
            val permission = permissionFor(resource) ?: return@filter false
            grants[permission] == true ||
                ContextCompat.checkSelfPermission(this, permission) ==
                PackageManager.PERMISSION_GRANTED
        }
        request.grant(approved.toTypedArray())
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Keep splash screen until initial page render commits to prevent white flash/lag
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)
        splashScreen.setKeepOnScreenCondition { isPageLoading }

        // The site is light-only, so the system bars get dark icons explicitly.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(
                android.R.color.transparent,
                android.R.color.transparent,
            ),
            navigationBarStyle = SystemBarStyle.light(
                android.R.color.transparent,
                android.R.color.transparent,
            ),
        )

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Safety fallback to dismiss splash screen if network is slow
        binding.root.postDelayed({
            isPageLoading = false
        }, 2500)

        applyInsets()
        configureSwipeRefresh()
        configureWebView()
        configureChromeClient()
        configureWebViewClient()
        configureDownloads()
        configureBackNavigation()

        binding.retry.setOnClickListener {
            binding.error.isVisible = false
            binding.web.loadUrl(lastFailedUrl ?: BuildConfig.WEB_ORIGIN)
        }

        if (savedInstanceState != null) {
            binding.web.restoreState(savedInstanceState)
        } else {
            // The bare origin, not /chat: the site decides whether to send the
            // user to the inbox or to sign-in, and it is the only party that
            // knows whether the session cookie is still valid.
            binding.web.loadUrl(BuildConfig.WEB_ORIGIN)
        }
    }

    private fun configureSwipeRefresh() {
        binding.swipeRefresh.setColorSchemeColors(
            ContextCompat.getColor(this, R.color.omi_brand_400)
        )
        binding.swipeRefresh.setOnRefreshListener {
            binding.web.reload()
        }
        // Only allow pull-down refresh when WebView is at the top
        binding.swipeRefresh.setOnChildScrollUpCallback { _, _ ->
            binding.web.scrollY > 0
        }
    }

    /**
     * Keeps content clear of the status bar, the navigation bar, display cutouts
     * and the keyboard.
     */
    private fun applyInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or
                    WindowInsetsCompat.Type.displayCutout()
            )
            val imeBottom =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
                } else {
                    0
                }
            view.setPadding(bars.left, bars.top, bars.right, maxOf(bars.bottom, imeBottom))
            WindowInsetsCompat.CONSUMED
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        CookieManager.getInstance().setAcceptCookie(true)

        with(binding.web) {
            // Hardware acceleration layer for 60/120fps fluid rendering
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.omi_surface))

            overScrollMode = View.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            isNestedScrollingEnabled = false

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true

                // Pre-rasterize offscreen tiles for buttery smooth zero-lag scrolling
                offscreenPreRaster = true

                useWideViewPort = true
                loadWithOverviewMode = true
                textZoom = 100

                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false

                // A call is only useful if it can start without a second tap.
                mediaPlaybackRequiresUserGesture = false

                javaScriptCanOpenWindowsAutomatically = false
                setSupportMultipleWindows(false)
                setGeolocationEnabled(false)
                setAllowFileAccess(false)
                setAllowContentAccess(false)
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW

                cacheMode = WebSettings.LOAD_DEFAULT

                // Lets the site detect the wrapper without a third-party SDK.
                // Also keeps the origin honest in server logs.
                userAgentString = "$userAgentString OmiChatApp/${BuildConfig.VERSION_NAME}"

                // The site is light-only. Without this, OEM WebViews that darken
                // "dark mode" web content would invert it against its will.
                if (WebViewFeature.isFeatureSupported(
                        WebViewFeature.ALGORITHMIC_DARKENING
                    )
                ) {
                    WebSettingsCompat.setAlgorithmicDarkeningAllowed(this, false)
                }
            }

            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
        }
    }

    private fun configureChromeClient() {
        binding.web.webChromeClient = object : WebChromeClient() {

            override fun onProgressChanged(view: WebView, newProgress: Int) {
                if (newProgress < 100) {
                    binding.progressBar.isVisible = true
                    binding.progressBar.progress = newProgress
                } else {
                    binding.progressBar.isVisible = false
                    isPageLoading = false
                    binding.swipeRefresh.isRefreshing = false
                }
            }

            /**
             * Camera and microphone for calls. Requested lazily - a user who
             * never places a call is never prompted.
             */
            override fun onPermissionRequest(request: PermissionRequest) {
                if (!request.origin.host.equals(appHost, ignoreCase = true)) {
                    request.deny()
                    return
                }

                val missing = request.resources
                    .mapNotNull(::permissionFor)
                    .filter {
                        ContextCompat.checkSelfPermission(this@MainActivity, it) !=
                            PackageManager.PERMISSION_GRANTED
                    }

                if (missing.isEmpty()) {
                    request.grant(request.resources)
                    return
                }

                permissionRequest = request
                permissionLauncher.launch(missing.toTypedArray())
            }

            /** Attachments. The site asks for these through an input[type=file]. */
            @Suppress("DEPRECATION")
            override fun onShowFileChooser(
                webView: WebView,
                filePathCallback: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams,
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback

                return try {
                    fileChooser.launch(
                        if (fileChooserParams.acceptTypes.isEmpty()) {
                            Intent(Intent.ACTION_GET_CONTENT).apply { type = "*/*" }
                        } else {
                            fileChooserParams.createIntent()
                        }
                    )
                    true
                } catch (e: ActivityNotFoundException) {
                    fileChooserCallback = null
                    false
                }
            }

            override fun onConsoleMessage(message: ConsoleMessage): Boolean {
                if (BuildConfig.DEBUG) {
                    Log.d(TAG, "${message.message()} (${message.sourceId()}:${message.lineNumber()})")
                }
                return true
            }
        }
    }

    private fun configureWebViewClient() {
        binding.web.webViewClient = object : WebViewClient() {

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest,
            ): Boolean = handleUrl(request.url)

            override fun onPageStarted(
                view: WebView,
                url: String,
                favicon: android.graphics.Bitmap?,
            ) {
                binding.error.isVisible = false
                binding.progressBar.isVisible = true
            }

            override fun onPageCommitVisible(view: WebView, url: String) {
                isPageLoading = false
                binding.progressBar.isVisible = false
                binding.swipeRefresh.isRefreshing = false
            }

            override fun onPageFinished(view: WebView, url: String) {
                isPageLoading = false
                binding.progressBar.isVisible = false
                binding.swipeRefresh.isRefreshing = false
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError,
            ) {
                if (!request.isForMainFrame) return
                isPageLoading = false
                binding.progressBar.isVisible = false
                binding.swipeRefresh.isRefreshing = false
                lastFailedUrl = request.url.toString()
                binding.error.isVisible = true
            }

            override fun onReceivedHttpError(
                view: WebView,
                request: WebResourceRequest,
                errorResponse: android.webkit.WebResourceResponse,
            ) {
                // Deliberately ignored for 4xx custom pages
            }

            override fun onRenderProcessGone(
                view: WebView,
                detail: android.webkit.RenderProcessGoneDetail,
            ): Boolean {
                Log.w(TAG, "WebView render process gone. Crashed: ${detail.didCrash()}")
                binding.web.loadUrl(lastFailedUrl ?: BuildConfig.WEB_ORIGIN)
                return true
            }
        }
    }

    /**
     * Decides what happens to a navigation.
     *
     * @return true when the WebView should not load it.
     */
    private fun handleUrl(url: Uri): Boolean {
        val scheme = url.scheme?.lowercase()

        // mailto:, tel:, sms:, intent: and any app deep link. The WebView cannot
        // act on these and would show "net::ERR_UNKNOWN_URL_SCHEME".
        if (scheme != null && scheme != "http" && scheme != "https") {
            openExternally(url)
            return true
        }

        val host = url.host ?: return false

        // The app's own site, in every version of it.
        if (host.equals(appHost, ignoreCase = true)) return false

        if (host.equals(BuildConfig.OAUTH_HOST, ignoreCase = true)) {
            // Supabase's authorize endpoint is part of signing in and has to stay
            // in the WebView - except the Google branch, which cannot work here.
            if (isGoogleAuthorize(url)) {
                showGoogleUnavailable()
                return true
            }
            return false
        }

        // Reached when Google has already been redirected to before we could
        // intercept the authorize call.
        if (host.equals("accounts.google.com", ignoreCase = true)) {
            showGoogleUnavailable()
            return true
        }

        openExternally(url)
        return true
    }

    /**
     * Google refuses to run OAuth inside an embedded WebView and answers
     * 403 disallowed_useragent. There is no flag that changes this, and the
     * failure is opaque - a Google-branded error page that looks like the app is
     * broken.
     *
     * Handing the flow to the system browser does not rescue it either: the
     * session lands in that browser's cookie jar, not in the WebView's, so the
     * user would finish signing in somewhere they cannot see. Interrupting with
     * a plain explanation and a route back to email is the honest outcome.
     *
     * Making Google sign-in work here needs the flow done natively - Supabase's
     * Android SDK or AppAuth - exchanging the code in the app and handing the
     * resulting session to the page.
     */
    private fun isGoogleAuthorize(url: Uri): Boolean =
        url.path.orEmpty().startsWith("/auth/v1/authorize") &&
            url.getQueryParameter("provider") == "google"

    private fun openExternally(url: Uri) {
        val intent = Intent(Intent.ACTION_VIEW, url).apply {
            addCategory(Intent.CATEGORY_BROWSABLE)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            startActivity(intent)
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(this, R.string.no_app_for_link, Toast.LENGTH_SHORT).show()
        }
    }

    private fun showGoogleUnavailable() {
        if (googleDialog != null) return
        // Framework AlertDialog rather than a Material one: it costs no extra
        // dependency and inherits the app's light theme.
        googleDialog = AlertDialog.Builder(this)
            .setTitle(R.string.google_blocked_title)
            .setMessage(R.string.google_blocked_body)
            .setPositiveButton(R.string.google_blocked_ok, null)
            .create()
            .also {
                it.setOnDismissListener { googleDialog = null }
                it.show()
            }
    }

    /** Hand attachments opened in the browser to the system downloader. */
    @Suppress("DEPRECATION")
    private fun configureDownloads() {
        binding.web.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            try {
                val cookies = CookieManager.getInstance().getCookie(url)
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    if (cookies != null) addRequestHeader("Cookie", cookies)
                    if (userAgent != null) addRequestHeader("User-Agent", userAgent)
                    addRequestHeader("Referer", "${BuildConfig.WEB_ORIGIN}/")

                    val name = URLUtil.guessFileName(url, contentDisposition, mimeType)
                    setTitle(name)
                    setDescription("Downloading $name")
                    setNotificationVisibility(
                        DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                    )
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name)
                }
                (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager)
                    .enqueue(request)
            } catch (e: Exception) {
                Log.w(TAG, "download failed", e)
                Toast.makeText(this, R.string.download_failed, Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Back walks the WebView's own history, then leaves the app.
     *
     * Going home from a chat and pressing back must not return to that chat, so
     * the history is cleared whenever the app is backgrounded.
     */
    private fun configureBackNavigation() {
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    when {
                        binding.error.isVisible -> finish()
                        binding.web.canGoBack() -> binding.web.goBack()
                        else -> {
                            // Hand the press on to the launcher rather than
                            // swallowing it.
                            isEnabled = false
                            onBackPressedDispatcher.onBackPressed()
                        }
                    }
                }
            },
        )
    }

    override fun onResume() {
        super.onResume()
        binding.web.onResume()
    }

    override fun onPause() {
        binding.web.onPause()
        // Write the session cookie to disk now. Without this a session
        // established seconds before backgrounding can be lost, which logs the
        // user out on the next cold start.
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.web.saveState(outState)
    }

    private fun permissionFor(resource: String): String? = when (resource) {
        PermissionRequest.RESOURCE_VIDEO_CAPTURE -> Manifest.permission.CAMERA
        PermissionRequest.RESOURCE_AUDIO_CAPTURE -> Manifest.permission.RECORD_AUDIO
        else -> null
    }

    private companion object {
        const val TAG = "OmiChat"
    }
}