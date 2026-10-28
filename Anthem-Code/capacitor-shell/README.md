# SAMECOR Android (Capacitor WebView shell)

Loads https://samecor.com in a WebView. Replaces the Bubblewrap TWA in `../android`
for Play closed testing (tester services would not accept a TWA). New Play app `com.samecor.app` (the old `com.samecor.twa` listing is abandoned). Same upload key.

- The web app detects this shell by the `SamecorApp` user-agent suffix
  (`src/lib/appShell.ts` → `isWebViewApp`). Google sign-in is hidden there because
  Google blocks OAuth in WebViews. Web Push does not work in a WebView.
- Links to other hosts open in the system browser (Capacitor default).
- Bump `versionCode` in `android/app/build.gradle` for every Play upload.

## Build a signed bundle (PowerShell)

```powershell
cd Anthem-Code\capacitor-shell
npm install
npx cap sync android
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:SAMECOR_KEYSTORE_PASSWORD = [Net.NetworkCredential]::new('', (Read-Host "Keystore password" -AsSecureString)).Password
cd android
.\gradlew.bat bundleRelease
Remove-Item Env:SAMECOR_KEYSTORE_PASSWORD
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`.
`android/local.properties` must contain `sdk.dir=C:/Users/PC/.bubblewrap/android_sdk`.
