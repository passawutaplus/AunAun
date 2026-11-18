# SAMECOR iOS app

The iOS app is the same idea as the Android one: a Capacitor shell that loads https://samecor.com.
The Xcode project lives in `../capacitor-shell/ios`, and it is built on a Codemagic cloud Mac (`/codemagic.yaml`),
so no Mac is needed. Bundle id `com.samecor.app`, iPhone only, iOS 15+.

## How the shell works

- **Safe area:** `ShellViewController.swift` keeps the web view inside the safe area, the way the Android shell pads its
  WebView. The page never draws under the status bar, notch or home indicator. `public/app-shell-boot.js` already drops
  `viewport-fit=cover` for every `SamecorApp` user agent, so the page lays out exactly as it does in the Android app.
- **Theme colour:** the strips outside the safe area take the page colour. The site calls
  `window.SamecorShell.setSystemBarColor(hex, dark)` (`src/lib/appShell.ts`), and the shell turns the status bar text
  light or dark to match.
- **App version:** `window.SamecorShell.getAppVersion()` returns `"1.0.0 (build)"` for Settings, the same shape as Android.
- **Navigation:** edge swipe goes back through page history. Pull to refresh comes from the site (`PullToRefresh`), and
  Capacitor already turns off the web view's bounce so the two do not fight. Links to other hosts open in Safari.
- **Detection:** the user agent ends in `SamecorApp SamecorIos` (`capacitor.config.json`). `isIosApp()` / `isNativeApp()`
  hide Google sign-in, KYC, shop, donate and Founding payments inside the app.
- **Launch screen and icon:** the SAMECOR mark from `F:\So1o\Samecor\svg\samecor. logo-04.svg`, light and dark launch
  backgrounds (`Assets.xcassets/LaunchBackground`). The icon is RGB with no alpha, as the App Store requires.
- **Permission prompts** (English in `Info.plist`, Thai in `th.lproj/InfoPlist.strings`): camera and microphone for
  photo and video posts (iOS crashes the app without these), saving an image to Photos, and location for the event route.
  `ITSAppUsesNonExemptEncryption = NO`: the app only uses HTTPS, so there is no export-compliance question per build.

## Build on Codemagic

Codemagic only builds when someone presses **Start new build**; pushes never start a build.

One-time setup (owner):

1. Apple Developer → Certificates, Identifiers & Profiles → Identifiers → register the App ID `com.samecor.app`.
2. App Store Connect → Apps → New App: iOS, name SAMECOR, primary language Thai, bundle id `com.samecor.app`, SKU `samecor-ios`.
3. App Store Connect → Users and Access → Integrations → App Store Connect API → generate a key with the
   **App Manager** role. Download the `.p8` file (Apple lets you download it only once) and note the Key ID and Issuer ID.
4. Make the signing key (once, on any computer): `ssh-keygen -t rsa -b 2048 -m PEM -f samecor_cert_key -q -N ""`.
   Keep `samecor_cert_key` private. It is what lets every build reuse the same distribution certificate.
5. Codemagic → AunAun → Environment variables → group `samecor_ios`, all marked **Secret**:

   | Variable | Value |
   |---|---|
   | `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID |
   | `APP_STORE_CONNECT_KEY_IDENTIFIER` | Key ID |
   | `APP_STORE_CONNECT_PRIVATE_KEY` | full contents of the `.p8` file |
   | `CERTIFICATE_PRIVATE_KEY` | full contents of `samecor_cert_key` |

Each build: Codemagic → AunAun → Start new build → workflow **iOS → TestFlight**, branch `main`. About 10–15 minutes.
The build creates the distribution certificate and App Store profile the first time. Then it uploads to App Store Connect.
The build appears in TestFlight for internal testers after Apple processes it, usually 10–30 minutes.

The repo is public. Never print secrets in build scripts, and never commit `.p8` or key files.

## Before sending to App Review

- Guideline 4.2 (minimum functionality): Apple can reject an app that only wraps a website. This build adds native
  safe-area theming, swipe back, pull to refresh and an offline page. Plan push notifications (APNs plus a native push
  plugin, since Web Push does not work in a WebView) as the next native feature before the first review.
- Sign in with Apple is not needed: the app shows no third-party sign-in (`SocialButtons` hides them in WebViews).
- In-app purchase is not needed: the app sells nothing (shop, donate and Founding payments are hidden by `isNativeApp()`).
- Fill `review-notes.md`, `app-privacy.md` and `app-store-listing.md`, and check them against the live app.
  Apple treats wrong privacy answers as a violation.

## Later

| Step | Needs |
|---|---|
| `apple-app-site-association` (open samecor.com links in the app) | Team ID from the Apple account |
| Push notifications | APNs key, a native push plugin, and the web side to register the device token |
| Downloads, share sheet, print inside the app | `@capacitor/filesystem` and `@capacitor/share`, the same gap as Android |

## Files in this folder

- `app-privacy.md`: draft answers for App Store Connect → App Privacy.
- `app-store-listing.md`: listing text (Thai and English) and screenshot sizes.
- `review-notes.md`: what to tell App Review, including a test account placeholder.
