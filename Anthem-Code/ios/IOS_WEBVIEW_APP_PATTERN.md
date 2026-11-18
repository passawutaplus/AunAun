# iOS WebView app pattern (Capacitor + Codemagic, no Mac)

How SAMECOR builds an App Store-ready iOS app around its website. Use this for any SAMECOR web app that ships to
iPhone. The first one to follow it is **Picker** (`passawutaplus/samecor-picker`, `com.samecor.picker`).

Reference implementation: `Anthem-Code/capacitor-shell/ios` in `passawutaplus/AunAun`. Copy files from there, then
change the values marked **(per app)**.

---

## 1. Project and build

| Standard | How | Why |
|---|---|---|
| Commit the Xcode project (`ios/`), using Swift Package Manager (no CocoaPods) | `npx cap add ios` once, then commit `ios/`. Its `.gitignore` already skips `App/App/public`, `capacitor.config.json` and `config.xml`, which `cap sync` regenerates | Native Swift files (section 3) need a project to live in. Regenerating `ios/` on every build throws them away |
| iPhone only, iOS 15+, `arm64` | `TARGETED_DEVICE_FAMILY = 1`, `IPHONEOS_DEPLOYMENT_TARGET = 15.0`, `UIRequiredDeviceCapabilities = arm64` (the template still says `armv7`) | No iPad screenshots or iPad review; iOS 15 gives WKDownload and the other APIs below |
| Shared scheme | `ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme` | `xcodebuild` on CI needs a scheme. Xcode only autocreates one when it opens the project on a Mac |
| One root view controller | `SceneDelegate` creates the window; remove `UISceneStoryboardFile` from `Info.plist` | Otherwise UIKit can also build `Main.storyboard`'s bridge, which means a second web view |
| Version and build number | `MARKETING_VERSION` in the project (**per app**). CI sets `CURRENT_PROJECT_VERSION = $BUILD_NUMBER` with `sed` | Every upload needs a higher build number. Codemagic's counter only goes up |
| Codemagic: manual builds, upload only | `codemagic.yaml` at the repo root with no `triggering` block, `working_directory` set to the shell folder, `submit_to_testflight: false` | Pushes do not spend build minutes. Internal TestFlight testers get the build without beta review |
| Signing created by CI | `keychain initialize` → `app-store-connect fetch-signing-files "$BUNDLE_ID" --type IOS_APP_STORE --create` → `keychain add-certificates` → `xcode-project use-profiles` | No signing files to upload by hand. The certificate comes from `CERTIFICATE_PRIVATE_KEY`, so every build and **every app** reuses the same distribution certificate (Apple allows only a few) |
| Secrets | One environment group per Codemagic app, holding the same 4 secrets: `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_IDENTIFIER`, `APP_STORE_CONNECT_PRIVATE_KEY`, `CERTIFICATE_PRIVATE_KEY` | One App Store Connect API key (role App Manager) and one certificate key serve all SAMECOR apps. Never commit or echo them, because the repos are public |

## 2. Icon and launch screen

| Standard | How |
|---|---|
| 1024 × 1024 icon, **RGB with no alpha**, square corners | `Assets.xcassets/AppIcon.appiconset` with one universal 1024 file. The App Store rejects icons with transparency |
| Launch screen uses no full-screen images | `LaunchScreen.storyboard`: a centred 64 pt mark (`Splash.imageset` at 1x/2x/3x, plus a dark-appearance variant) on a named colour `LaunchBackground` (light and dark) |
| Launch colour = page background | Use the same light and dark values as the site's `--background`, so launch, shell and page meet with no flash |

SAMECOR renders these from the SVG mark with a short Python + PyMuPDF script. MuPDF ignores Illustrator's
`<style>` classes, so put `fill="#…"` on the paths before rendering.

## 3. Native shell (copy these two Swift files)

`ShellViewController.swift` contains `ShellViewController` (the root), `SamecorBridgeViewController` (a
`CAPBridgeViewController` subclass) and the page bridge. `ShellWebFeatures.swift` fills WKWebView's gaps. Add both
to the project's Sources build phase.

| Standard | What the code does | If you skip it |
|---|---|---|
| **Safe area** | The root view controller pins Capacitor's view to `safeAreaLayoutGuide`. The page never draws under the status bar, notch or home indicator | Headers sit under the clock unless every page pads with `env(safe-area-inset-*)` |
| **Bar colour follows the page** | The page calls `window.<Shell>.setSystemBarColor(hex, dark)`. The root paints the strips and flips the status bar between `.darkContent` and `.lightContent` | Light text on a light page, or the reverse |
| **No white flash** | Web view `isOpaque = false` with clear backgrounds, so the root colour shows while loading | White frame on every launch in dark mode |
| **Swipe back** | `allowsBackForwardNavigationGestures = true` (works with single-page-app history) | iPhone has no back button. Pages without an on-screen back link become dead ends |
| **Downloads** | Blob/data links, `download` links and `Content-Disposition: attachment` become a `WKDownload` saved to a temp file, then the share sheet opens (Save to Files, Save Image, AirDrop) | The button does nothing. App Review reports it as a broken feature (2.1) |
| **New windows on the same site** | `target="_blank"` / `window.open` to the app's own host load in the app. Other hosts still open in Safari (Capacitor) | Capacitor sends every new window to Safari, including your own pages |
| **Print** | `window.print` → `UIPrintInteractionController` with the web view's print formatter | `window.print()` does nothing in WKWebView |
| **Share** | If WebKit has no `navigator.share`, a promise-based shim opens `UIActivityViewController` | Share buttons throw or do nothing |
| **App version** | `window.<Shell>.getAppVersion()` → `"1.0.0 (42)"` for the Settings page | No way to tell which build a tester runs |

Capacitor facts the code relies on (Capacitor 8):

- `loadView` is final, and the user content controller is replaced after `webViewConfiguration(for:)` returns. So add user scripts and message handlers in `capacitorDidLoad()`, through `webView.configuration.userContentController`.
- Capacitor already sets `scrollView.bounces = false` and disables zoom by default.
- `ShellWebFeatures` takes over `navigationDelegate` and `uiDelegate` and forwards everything it does not handle to Capacitor's `WebViewDelegationHandler`, using `responds(to:)` and `forwardingTarget(for:)`. Install it in `capacitorDidLoad()`, before the first load.
- The `WKScriptMessageHandler` goes through a weak proxy, because the content controller retains its handlers.

**Per app:** theme colours (`ShellTheme`), the JS bridge name (`SamecorShell`), the message handler name, and the user-agent marker in `capacitor.config.json` → `ios.appendUserAgent`.

## 4. Info.plist and privacy

| Key | Value | Why |
|---|---|---|
| `ITSAppUsesNonExemptEncryption` | `false` | HTTPS only. Skips the export-compliance question on every upload |
| `NSCameraUsageDescription` | required if any `<input type=file accept=image/* or video/*>` or `getUserMedia` exists | **iOS kills the app** the moment the camera opens without it |
| `NSMicrophoneUsageDescription` | required if video can be recorded (`accept` includes `video/*`) | Same crash, when recording video |
| `NSPhotoLibraryAddUsageDescription` | required if users can save images (long-press → Save, or the share sheet) | Same crash, on save |
| `NSPhotoLibraryUsageDescription` | only if the app reads the library directly. The WKWebView file picker uses PHPicker and needs no permission | Apple asks why a permission is needed when it is unused |
| `NSLocationWhenInUseUsageDescription` | if the site calls `navigator.geolocation` | Without it, location is silently denied |
| `NSBluetoothAlwaysUsageDescription` | Picker: the BLE plugin needs it | Crash on the first scan |
| English in `Info.plist`, Thai in `th.lproj/InfoPlist.strings` | add `th` to `knownRegions` and add the variant group to Resources | Thai users see Thai prompts. The reviewer can read English |
| `PrivacyInfo.xcprivacy` (app level) | `NSPrivacyTracking = false`, empty tracking domains and accessed APIs | Apple's privacy manifest. Capacitor ships its own for its APIs |

Write purpose strings as plain sentences that say what the user gets: "uses the camera when you take a photo to post".

## 5. App Review rules a WebView app trips over

| Guideline | Rule | SAMECOR status |
|---|---|---|
| 4.2 Minimum functionality | Must be more than a website. List the real native features in the review notes | Sections 3 and 4 help. **Push notifications are the next feature to add**. Picker's native Bluetooth already counts |
| 2.3.10 | No mention of Android, Google Play or "download the app" inside the iOS app | Check every banner and footer that switches on "native app" |
| 3.1.1 / 3.1.3 | Digital goods and subscriptions need Apple In-App Purchase. No prices, upgrade buttons or "pay on our website" links for them | Hide them when `isIosApp()` / `isNativeApp()` is true. Physical goods may use other payments |
| 4.8 Sign in with Apple | Required only if the app offers Google, LINE, Facebook or other third-party login | Hide third-party login in the WebView (Google blocks it there anyway), or add Sign in with Apple |
| 5.1.1(v) | Account deletion starts inside the app | Settings → Privacy → delete account |
| 1.2 User content | Report content, block users, act on reports, publish contact info | Report and block in menus. Name where reports are handled in the review notes |
| 2.1 Completeness | Demo account in App Review Information. Every visible button works | Downloads, print and share are fixed in section 3. Remove anything still unfinished |
| 5.1.2 / App Privacy | App Store Connect privacy answers must match what the site collects (Sentry, analytics, account data) | Answer from the real data flows, not guesses |

## 6. Owner steps (once per app)

1. Developer portal → Identifiers → register the bundle id **(per app)**.
2. App Store Connect → New App: name, primary language Thai, bundle id, SKU.
3. The API key and certificate key are shared by all apps. If they already exist, reuse them.
4. Codemagic → add the repo → create the environment group with the 4 secrets → Start new build.
5. TestFlight: add internal testers. Before App Review, fill the listing, the privacy answers and the review notes.

---

## Picker: what to change

The Picker repo already has `ios-app/`, `codemagic.yaml`, a Bluetooth shim and `scripts/patch-ios.sh` (permission
strings, iPhone only, portrait only). To match this pattern:

1. **Commit the iOS project** instead of running `rm -rf ios && npx cap add ios` on every build. Run it once, apply
   `patch-ios.sh` once, then add the Swift files and commit `ios-app/ios`. Keep generating icons with `@capacitor/assets`
   when the art changes, or commit the generated catalog.
2. **Signing:** switch from `integrations` + `ios_signing` to the `fetch-signing-files --create` script in section 1.
   Use the same `CERTIFICATE_PRIVATE_KEY` and API key as SAMECOR, in an environment group named e.g. `picker_ios`.
   Then neither app needs signing files uploaded by hand, and both share one distribution certificate.
3. Copy `ShellViewController.swift` and `ShellWebFeatures.swift`:
   - Change `ShellTheme` to Picker's colours. Its `ios.backgroundColor` is `#F2F2F0`.
   - Rename the bridge (e.g. `PickerShell`), and only if the Picker site wants the bar-colour and version calls. Otherwise drop the theme message and keep the root's colour fixed.
   - **Check that Capacitor's root view controller can be replaced without breaking `@capacitor-community/bluetooth-le`.** The plugin only needs `bridge.viewController` to present its device list, which works from a child view controller.
4. **Safe area:** Picker uses `contentInset: never` and loads `?app=1&src=ios`. Choose one approach:
   - Keep `viewport-fit=cover` and confirm every Picker screen pads with `env(safe-area-inset-*)`.
   - Or use the root view controller from section 3 and drop `viewport-fit=cover` for its user agent.
   Test on a notched iPhone either way.
5. `submit_to_testflight: false` (upload only) unless external testers are needed. External testing needs beta review info filled in App Store Connect.
6. Add `PrivacyInfo.xcprivacy`, change `UIRequiredDeviceCapabilities` to `arm64`, and add Thai `InfoPlist.strings` if the prompts should be bilingual.
   Its current prompts are Thai only, which App Review accepts, but English helps the reviewer.
7. Review notes: list native Bluetooth (pairing with the Picker device) as the main native feature (4.2). Give App Review a way
   to see the app work without the hardware, such as a demo mode or a video link in the notes. Otherwise expect a 2.1 rejection.
