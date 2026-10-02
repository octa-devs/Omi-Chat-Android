# Omi Chat — Android

A native Android shell for [omichat.fun](https://omichat.fun). The UI is the
website; this project supplies the launcher entry, the icon, the window
behaviour and the pieces of Android the web platform cannot reach on its own —
file attachments, downloads, back navigation, and camera/microphone for calls.

There is no duplicated chat logic here. Anything that changes is changed in the
web app and reaches this app on the next load.

---

## Read this first: Google sign-in

**Google sign-in does not work inside this app, by design.**

Google refuses to run OAuth in an embedded WebView and answers with
`403 disallowed_useragent`. There is no setting that changes this. The app
intercepts the flow and explains why, then points at email sign-in (a one-time
code, about ten seconds).

Sending the flow to the system browser does not rescue it either: the Supabase
session would land in *that* browser's cookie jar, not in this WebView's, so
sign-in would appear to succeed and then show a signed-out app. That is a worse
failure than an honest message.

**Email and OTP, files, chats and calls all work.** If Google sign-in is needed,
it has to be done natively — Supabase's Android SDK or AppAuth, exchanging the
code in the app and handing the resulting session to the page. That is a
separate piece of work, and the interception in
`MainActivity.handleUrl()` is the single place to remove.

---

## Requirements

| | |
|---|---|
| JDK | 17 (Android Gradle Plugin 8.7 will not run on anything older) |
| Android SDK | platform 35, build-tools 35 |
| Gradle | 8.9 — via the wrapper, nothing to install |

Point the build at your SDK with a `local.properties` containing
`sdk.dir=/path/to/Android/sdk`, or have `ANDROID_HOME` set.

## Build

```bash
./gradlew :app:assembleRelease     # signed APK -> app/build/outputs/apk/release/
./gradlew :app:installDebug        # straight onto a connected device
./gradlew :app:lint                # lint is not run as part of a release build
```

On Windows use `gradlew.bat`.

## Signing

Release signing is **optional until you want to share a build.** Without a
keystore the release variant is signed with the debug key, so a fresh clone
always produces an installable APK rather than failing on a missing secret.

> **Set up signing before you hand the app to anyone.** Android will not let a
> debug-signed install be replaced by a release-key-signed one — the signatures
> have to match for the whole life of an install. Switching later means asking
> everyone to uninstall first, which loses local state.

```bash
keytool -genkeypair -v -keystore omi-release.jks \
        -keyalg RSA -keysize 4096 -validity 10000 -alias omi

cp keystore.properties.example keystore.properties   # then fill it in
base64 -w0 omi-release.jks > omi-release.jks.b64     # for CI
```

`keystore.properties` and any `*.jks` are gitignored.

## Continuous integration

`.github/workflows/release.yml` builds an APK on every push and publishes it on
a tag. Add these repository secrets under **Settings → Secrets and variables →
Actions**:

| Secret | Value |
|---|---|
| `OMI_KEYSTORE_BASE64` | `cat omi-release.jks.b64` |
| `OMI_KEYSTORE_PASSWORD` | keystore password |
| `OMI_KEY_ALIAS` | `omi` |
| `OMI_KEY_PASSWORD` | key password |

Without them the workflow still produces a debug-signed APK and says so in the
run summary — it does not fail.

Publish a release by pushing a tag:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

The workflow writes `versionName` from the tag, derives `versionCode` from the
build date, and attaches the APK to the GitHub release. Re-running a tag replaces
the asset rather than failing, so a fixed build can be re-shipped under the same
version.

## Developing against a local site

Debug builds permit cleartext to `localhost`, `127.0.0.1` and `10.0.2.2` (the
emulator's alias for the host), so the wrapper can point at a Next.js dev server:

```bash
# in the web app
npm run dev

# here
./gradlew :app:installDebug -PomiOrigin=http://10.0.2.2:3000
```

Release builds resolve `networkSecurityConfig` from `src/main`, where cleartext
is refused everywhere.

## The icon

`ic_launcher_foreground` is derived from the site's own
`public/brand/omi-chat-logo.png`: the blue-on-white mark is converted to a white
silhouette with a soft alpha recovered from its distance from white, then
scaled into the adaptive-icon safe zone. Adaptive icons (Android 8+) get the
gradient background as a vector, so nothing is resampled from a bitmap.
`monochrome` is set, which gives a themed icon on Android 13+.

Legacy PNGs exist for API 24–25. To regenerate them after a brand change, re-run
the generator in this repo's history rather than hand-editing five densities.

## Layout

```
app/src/main/java/fun/octadevs/omichat/MainActivity.kt   all of the behaviour
app/src/main/res/mipmap-*/                                generated launcher icons
app/src/main/res/values/themes.xml                        light-only, on purpose
.github/workflows/release.yml                             CI, signing, release
```

## Why the window settings look the way they do

- **No `values-night`.** The site is light-only. Honouring the system dark theme
  would put a dark window behind a light page and flash on every cold start.
- **`configChanges` covers rotation and keyboard.** Otherwise the activity is
  recreated and the WebView reloads — the single most common cause of a WebView
  app feeling slow. Orientation change and every keystroke stay put.
- **Insets are applied as padding, and the IME is only handled that way from
  Android 11.** Below that `adjustResize` still resizes the window, so padding
  too would lift the composer twice its height.
- **A themed splash screen.** Without it the launcher hands off to a blank white
  window while the WebView spins up, which is what actually reads as a slow start.
- **`CookieManager.flush()` on pause.** A session established seconds before
  backgrounding is otherwise lost, and the user is signed out on the next cold
  start.
- **The WebView history is not cleared on background.** Going home from a chat
  and pressing back should not land in that chat.
- **Sub-resource failures are ignored.** A failed font or avatar must never
  replace a working conversation with an error screen.
- **Backups and device transfer are disabled.** The WebView cookie jar holds a
  live Supabase session; copying it elsewhere would hand over a signed-in
  browser.
- **Only system certificate authorities are trusted**, so a proxy certificate
  installed on the device cannot silently intercept traffic.

## Licence

Same as the web app. Omi Chat is by [Octa Devs](https://www.octadevs.fun) —
[@octadevsofficial](https://instagram.com/octadevsofficial) ·
hello@octadevs.fun