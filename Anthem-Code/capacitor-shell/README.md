# SAMECOR app shell (Capacitor: Android and iOS)

**iOS:** the Xcode project is in `ios/`. It is built on Codemagic (`/codemagic.yaml`), not on this PC. See
`../ios/README.md` for how the shell works, the one-time Codemagic setup and the TestFlight steps.
After changing `capacitor.config.json` or `www/`, run `npm run sync:ios` and commit what it changes under `ios/`.

## Android

Loads https://samecor.com in a WebView. Replaces the Bubblewrap TWA in `../android`
for Play closed testing (tester services would not accept a TWA). New Play app `com.samecor.app` (the old `com.samecor.twa` listing is abandoned). Same upload key.

- The web app detects this shell by the `SamecorApp` user-agent suffix
  (`src/lib/appShell.ts` → `isWebViewApp`). From 1.2.0 `SamecorShell.getFeatures()` tells the site what the build can do
  (`src/lib/nativeShell.ts`); 1.1.1 and older report nothing, so the site keeps their old behaviour.
- **Sign-in (1.2.0):** Google refuses OAuth inside a WebView, so Google / LINE / Facebook open in a Custom Tab
  (`SamecorShell.openAuth`). Supabase returns to `https://samecor.com/auth/app-return`, which jumps to
  `com.samecor.app://auth/callback?code=…`; `MainActivity.onNewIntent` loads `/auth/callback?code=…` in the WebView,
  where the PKCE verifier lives. Password reset uses the same path with `?to=reset-password`.
- **App Links (1.2.0):** content pages of samecor.com open in the app (`AndroidManifest.xml`, verified by
  `public/.well-known/assetlinks.json`; same page list as the iOS `apple-app-site-association`).
- **Push (1.2.0):** `@capacitor/push-notifications` with Firebase Cloud Messaging. Needs `android/app/google-services.json`
  (gitignored; the release build stops without it unless `SAMECOR_ALLOW_NO_FCM=1`). The token is saved with
  `save_fcm_token`; `send-push` sends through FCM with the `FCM_SERVICE_ACCOUNT` secret.
- **Page gaps filled (1.2.0):** `assets/samecor-shell.js` runs at document start on samecor.com: `window.print` → Android
  print dialog, `navigator.share` → share sheet, blob / data / `download` links → Downloads (MediaStore on Android 10+,
  share sheet before). Same-site web downloads go to DownloadManager.
- **Rating (1.2.0):** `SamecorShell.requestReview()` → Google Play In-App Review.
- Links to other hosts open in the system browser (Capacitor default).
- Bump `versionCode` in `android/app/build.gradle` for every Play upload. Owner steps for 1.2.0: `RELEASE_1.2_OWNER_STEPS.md`.

## Build a signed bundle (PowerShell)

```powershell
cd Anthem-Code\capacitor-shell
npm install
npx cap sync android
# android\app\google-services.json must be there (Firebase, see RELEASE_1.2_OWNER_STEPS.md)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:SAMECOR_KEYSTORE_PASSWORD = [Net.NetworkCredential]::new('', (Read-Host "Keystore password" -AsSecureString)).Password
cd android
.\gradlew.bat bundleRelease
Remove-Item Env:SAMECOR_KEYSTORE_PASSWORD
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`.
`android/local.properties` must contain `sdk.dir=C:/Users/PC/.bubblewrap/android_sdk`.

## Location (Exhibition route start point)

`AndroidManifest.xml` declares `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` so the WebView can answer
`navigator.geolocation` (Capacitor's BridgeWebChromeClient asks the user at runtime). The position is only
used on the device to draw the route; a ~100 m rounded point goes to routing.openstreetmap.de. Play Console →
Data safety: declare "Approximate / Precise location — not collected" (not sent to SAMECOR) and mention the
routing service if Play asks about third-party sharing.
