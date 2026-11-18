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
| **Print** | `window.print` → `UIPrintInteractionController` with the web view's print formatter. When the sheet closes, the shell fires `afterprint` | `window.print()` does nothing in WKWebView |
| **Print from an iframe** (web side) | WKWebView cannot print an iframe. In the app, put the paper in the page with print-only CSS that hides everything else, call `window.print()`, and clean up on `afterprint` (SAMECOR: `src/lib/documents/printDocument.ts` → `printInPage`) | Print buttons for quotes, invoices and receipts do nothing |
| **Blob downloads** (web side) | Revoke blob URLs after about 60 s, not right after `click()` (SAMECOR: `src/lib/downloadBlob.ts`). WebKit reads the blob after the handler returns | The download fails silently, and the share sheet never opens |
| **Share** | If WebKit has no `navigator.share`, a promise-based shim opens `UIActivityViewController` | Share buttons throw or do nothing |
| **App version** | `window.<Shell>.getAppVersion()` → `"1.0.0 (42)"` for the Settings page | No way to tell which build a tester runs |

Capacitor facts the code relies on (Capacitor 8):

- `loadView` is final, and the user content controller is replaced after `webViewConfiguration(for:)` returns. So add user scripts and message handlers in `capacitorDidLoad()`, through `webView.configuration.userContentController`.
- Capacitor already sets `scrollView.bounces = false` and disables zoom by default.
- `ShellWebFeatures` takes over `navigationDelegate` and `uiDelegate` and forwards everything it does not handle to Capacitor's `WebViewDelegationHandler`, using `responds(to:)` and `forwardingTarget(for:)`. Install it in `capacitorDidLoad()`, before the first load.
- The `WKScriptMessageHandler` goes through a weak proxy, because the content controller retains its handlers.

**Per app:** theme colours (`ShellTheme`), the JS bridge name (`SamecorShell`), the message handler name, and the user-agent marker in `capacitor.config.json` → `ios.appendUserAgent`.

### Push notifications (APNs)

Web Push does not exist in WKWebView. Use `@capacitor/push-notifications`. On a remote `server.url` page, the bridge
injects the plugin as `window.Capacitor.Plugins.PushNotifications`, so the website needs no Capacitor npm package.

| Piece | SAMECOR file |
|---|---|
| Plugin in the shell. Keep it off Android with `"android": { "includePlugins": [] }`; otherwise Android needs Firebase | `capacitor-shell/package.json`, `capacitor.config.json` (`plugins.PushNotifications.presentationOptions` shows alerts in the foreground) |
| Token hand-off: `didRegisterForRemoteNotificationsWithDeviceToken` → `.capacitorDidRegisterForRemoteNotifications` | `ios/App/App/AppDelegate.swift` |
| `aps-environment = production` (CI builds only use App Store profiles) and `CODE_SIGN_ENTITLEMENTS` in both configs | `ios/App/App/App.entitlements`, `project.pbxproj` |
| Web: check, request, register, save the token. Tapping a notification calls `history.pushState` and then dispatches `popstate`, so the router moves without a reload. The token is refreshed on sign-in | `src/lib/nativePush.ts`, wired into `src/lib/pushNotifications.ts` |
| DB: the token is stored as `endpoint = 'apns:<hex>'`, shell `ios`, in the existing push table | `Solo-Code/supabase/migrations/20261118120000_ios_push_tokens.sql` |
| Sender: ES256 JWT from the `.p8` via WebCrypto, HTTP/2 POST to `api.push.apple.com/3/device/<token>`. Delete the row on 410 / BadDeviceToken | `Solo-Code/supabase/functions/_shared/apns.ts`, `send-push/index.ts` |

Owner, once per Apple team:
- Tick **Push Notifications** on the App ID before the first build. Otherwise signing fails, because the entitlement asks for push.
- Create one **APNs key** (Keys → APNs). It works for every app of the team.
- Set `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, plus `APNS_TOPIC` = the bundle id when it is not `com.samecor.app`.

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
| 4.2 Minimum functionality | Must be more than a website. List the real native features in the review notes | Push, share, print and save sheets, camera, swipe back, pull to refresh, safe-area theming. Picker's native Bluetooth counts too |
| 2.3.10 | No mention of Android, Google Play or "download the app" inside the iOS app | Store badges on `/learn` and the "download the app" panel are hidden with `isNativeApp()`. Search the site for `Google Play`, `Play Store` and badge images |
| 3.1.1 / 3.1.3 | Digital goods and subscriptions need Apple In-App Purchase. No prices, upgrade buttons or "pay on our website" links for them | Hide them when `isNativeApp()` is true: routes (`/upgrade`, checkout), env-flag features (So1o links, Pro and In-House upsells) and menu items. Do not rely on env flags being off in production. Physical goods may use other payments |
| 4.8 Sign in with Apple | Required only if the app offers Google, LINE, Facebook or other third-party login | Hide third-party login in the WebView (Google blocks it there anyway), or add Sign in with Apple |
| 5.1.1(v) | Account deletion starts inside the app, and the app says how long it takes | Settings → My data → delete, behind a password check, with dates shown. A flow that needs manual approval is accepted but is a risk; approve requests fast |
| 1.2 User content | Report content, block users, act on reports within 24 h, publish contact info, Terms with zero tolerance | Report and block in every "…" menu. Reports alert the admin LINE group. The 24-hour promise is in Terms section 4 |
| 2.1 Completeness | Demo account in App Review Information. Every visible button works | `tester@samecor.com`, password sign-in. Don't approve its delete request during review |
| 5.1.2 / App Privacy | App Store Connect privacy answers and the privacy policy must match what the app does (Sentry, analytics, account data, push token) | Privacy policy names the iOS app, its permission prompts, the APNs token and Apple. `app-privacy.md` lists the answers |

### Second-pass checklist (found when SAMECOR was audited again)

Search the website for each of these and gate it with `isIosApp()` / `isNativeApp()`:
- **"Beta" wording**: feedback buttons, BETA chips, beta-tester badges and progress cards (2.2). In an App Store build nothing may say beta.
- **Home-made star ratings** that look like an App Store review prompt (5.6.1). Hide them, or use `SKStoreReviewController`.
- **OAuth buttons anywhere**, including "link Google / LINE account" in settings, not only on the sign-in page. They open
  Safari and never come back (2.1), and showing Google login can raise the Sign in with Apple rule (4.8).
- **"Coming soon" or "not available in this version" pages** (2.1). In the app, redirect to home instead.
- **Payment promises** such as "paying through the app opens soon", wallets, referral rewards that can be cashed out,
  and upgrade links. Gate them in the code itself, not only with env flags, since flags can be on in production (3.1.1).
- **Other stores in legal pages**: render only the current platform's store (SAMECOR: `storePlatforms()` in `appShell.ts`).
- **Permission and error copy** that says "browser". In the app, point to iPhone Settings → app → Notifications.
- **App Privacy answers** must cover analytics that load without consent (Vercel Analytics and Speed Insights), view
  counts stored with the user id, optional phone numbers, and contact or financial details typed into documents.

Before submitting:
- **Deploy the website**, because the app only shows what samecor.com serves.
- **Demo account** must be non-admin, with a published item and a chat thread. Never approve its delete request during review.
- **Review notes**: explain any prices the reviewer can see (freelance quotes are 3.1.3(e)), and name the content filter.

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
8. Push is optional for Picker v1. Its iOS app has no sign-in yet, so there is no user to send to, and Bluetooth already
   carries the 4.2 argument. If sign-in comes later, follow the push section in section 3, with `APNS_TOPIC=com.samecor.picker`.
9. Run the web-side checks from section 3 against picker.samecor.com:
   - Blob downloads must revoke late, for example on palette export.
   - Any print must come from the main page, not an iframe.
   - No store badges, prices or "download the app" text may show in the app.
