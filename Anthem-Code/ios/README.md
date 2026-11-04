# SAMECOR iOS app — preparation (nothing here has been built or submitted)

The iOS app is the same idea as the Android one: a Capacitor shell that loads https://samecor.com
(`../capacitor-shell`). iOS apps cannot be built on Windows, and the Apple account is not set up yet, so this
folder holds the decisions and drafts that do not need either.

## Already done in the web code

- `src/lib/appShell.ts`: `isIosApp()` (user-agent marker `SamecorIos`), `isNativeApp()` (iOS or Android) and `shellName()`.
  `isAndroidApp()` is false inside the iOS app. Behaviour that is about "the store app" (no KYC, no commerce prompts,
  no download card, pull to refresh) now uses `isNativeApp()`. Analytics and Sentry tag the shell as `ios`.
- `capacitor-shell/capacitor.config.json` has an `ios` block: user agent `SamecorApp SamecorIos`, `contentInset: never`
  so the page draws under the notch and the CSS `env(safe-area-inset-*)` rules apply (the viewport already has `viewport-fit=cover`).
- Already satisfying Apple's rules: account deletion inside the app (Settings → Privacy), block user in the comment, project and community menus, report in chat (report on projects and comments is not confirmed yet: check before submitting), a privacy policy URL.

## What is blocked on the Apple account or a Mac

| Step | Needs |
|---|---|
| Enrol in the Apple Developer Program | the owner, with payment (check the current yearly fee) |
| Bundle id, App Store Connect record, signing certificates | Apple account |
| `npx cap add ios`, open in Xcode, build, TestFlight | a Mac or a cloud Mac builder (CI with macOS runners) |
| `apple-app-site-association` (open links in the app) | Team ID from the account |
| Push notifications | APNs key from the account, plus a native push plugin (Web Push does not work in a WebView) |
| Sign in with Apple | only needed if Google sign-in is turned on in the iOS app; it is hidden in WebViews today |

## Review risk to plan for

Apple can reject an app that only wraps a website (guideline 4.2, minimum functionality). Check the current
wording before submitting. Native features that give it a reason to exist: push notifications, sharing a photo
into SAMECOR from the gallery or camera, haptics, an offline page. Keep these in mind when choosing what goes
into the first build. If review rejects it, the alternative is a React Native (Expo) app, which EAS Build can
build from Windows.

## Files in this folder

- `app-privacy.md`: draft answers for App Store Connect → App Privacy.
- `app-store-listing.md`: listing text (Thai and English) and the screenshot sizes to prepare.
- `review-notes.md`: what to tell App Review, including a test account placeholder.

Review every draft against the live app before submitting: Apple treats wrong privacy answers as a violation.

## Location (Exhibition route start point)

When the iOS Capacitor project is created, add to `ios/App/App/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>ใช้ตำแหน่งของคุณเป็นจุดเริ่มต้นเส้นทางไปสถานที่จัดงาน (ไม่บันทึกขึ้นเซิร์ฟเวอร์)</string>
```

WKWebView then answers `navigator.geolocation` with the system prompt. App Privacy: location is used on the
device only (a ~100 m rounded point is sent to the routing service to draw the route).
