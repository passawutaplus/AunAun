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
- **Web gaps filled** (`ShellWebFeatures.swift`):
  - Downloads (blob links, `download` links, attachments) open the iOS share sheet, where the user can Save to Files or Save Image.
  - Same-site `target="_blank"` / `window.open` links stay in the app.
  - `window.print()` opens the iOS print sheet.
  - `navigator.share()` gets a native fallback.
- **Privacy manifest:** `PrivacyInfo.xcprivacy` declares no tracking.
- **Pattern for other apps** (Picker): `IOS_WEBVIEW_APP_PATTERN.md`.
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

1. Apple Developer → Certificates, Identifiers & Profiles → Identifiers → register the App ID `com.samecor.app`,
   and tick **Push Notifications** under Capabilities. Without it the App Store profile lacks `aps-environment`
   and the build fails at signing (`App/App.entitlements` asks for push).
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

## Push notifications

How it works:
- The app uses `@capacitor/push-notifications` (APNs). `AppDelegate` passes the device token to the plugin, and
  `src/lib/nativePush.ts` saves it with `save_apns_token`. That row lands in `shared.push_subscriptions` with shell `ios`.
- `send-push` sends every in-app notification to those rows through APNs (`Solo-Code/supabase/functions/_shared/apns.ts`).
- The settings switch and the studio nudge work as on the web, because `pushNotifications.ts` routes to `nativePush.ts`.
- Tapping a notification opens its page in the app.

One-time setup (owner, after the Apple account is active):

1. Apple Developer → Keys → **+** → enable **Apple Push Notifications service (APNs)** → download `AuthKey_XXXXXXXXXX.p8`
   (once only). Note the Key ID and the Team ID (top right of the developer site).
2. Supabase → Edge Functions → Secrets: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (full contents of the `.p8`).
3. Apply `Solo-Code/supabase/migrations/20261118120000_ios_push_tokens.sql`.
4. Deploy `send-push` from `Solo-Code/` (`npx supabase functions deploy send-push`), not from the repo root.

Until the secrets exist, `send-push` skips iOS devices and web push works as before.

## Before sending to App Review

All three review documents are filled in. Check them against the live app before submitting:
- `review-notes.md`: paste into App Review Information.
- `app-privacy.md`: the App Privacy answers.
- `app-store-listing.md`: listing text and screenshot sizes.

| Guideline | Status |
|---|---|
| 4.2 Minimum functionality | Covered by native features: push notifications, share/print/save sheets, camera capture, swipe back, pull to refresh, safe-area theming, offline page |
| 2.3.10 Other platforms | The `/learn` store badges and the Settings "download the app" panel are hidden in the app (`isNativeApp()`) |
| 3.1.1 Payments | Shop, donate, Founding, `/upgrade`, subscriptions, So1o links and the In-House upsell are all hidden in the app |
| 4.8 Sign in with Apple | From 1.1.0 the app offers Google, LINE and Facebook (ASWebAuthenticationSession), so it also offers native Sign in with Apple, first in the row (`ShellSignIn.swift`, `signInWithApple` in `src/integrations/oauth.ts`) |
| 1.2 User content | Report and block on projects, comments, profiles and chat. Reports alert the admin LINE group. Terms section 4 promises 24-hour handling, so the owner must act on reports within a day |
| 5.1.1(v) Account deletion | Settings → My data → Delete account, behind a password check. A team member approves it, it hides the account, and the account is purged after 30 days (the timeline is shown). See the risk below |
| 2.1 Completeness | Demo account `tester@samecor.com`. Downloads, print and share work in the app |
| 5.1.2 Privacy | The privacy policy names the iOS app, its permission prompts, the APNs token and Apple |

Also hidden in the iOS app after the second audit: beta wording and badges, the star-rating prompt, "link Google account",
"coming soon" pages (they redirect home), "paying through SAMECOR soon" text, payments and referral rewards. Legal pages
name only the current platform's store.

Remaining risks:
- **Deletion needs manual approval.** This was the owner's decision on 2026-11-02. The app now says the team acts within
  7 business days. Apple accepts a request flow that states its timeline, but some reviewers still push back. Approve
  delete requests quickly, and never approve one from the demo account during review.
- **Report handling.** Answer reports from the LINE admin alerts within 24 hours, as the Terms now say.
- **Deployment.** The web fixes only reach the app once `main` is deployed to samecor.com. Submit only after that deploy,
  after the push setup above, and after a TestFlight check on a real iPhone.
- **Demo account.** Give `tester@samecor.com` a chat thread before submitting.
- **Privacy policy section 2** still describes the retired So1o / Omise ecosystem and links to solofreelancer.com. Have the
  owner update it, because a dead link or a retired service in the policy invites questions.
- **Email links** (password reset) requested in the app come back through `https://samecor.com/auth/app-return?to=reset-password`,
  which opens `com.samecor.app://auth/reset-password` (Safari asks "Open in SAMECOR?"). Sign-up uses a 6-digit code, so it stays in the app.
- **Sign in with Apple and account deletion.** Apple expects apps that use Sign in with Apple to revoke the user's Apple token
  when the account is deleted. From app 1.1.1 the Apple sheet also returns a one-time authorization code; the site sends
  it to the `apple-signin-token` edge function, which keeps Apple's refresh token, and `account-purge` revokes it before
  deleting the account (`Solo-Code/supabase/functions/_shared/apple-signin.ts`, secrets `APPLE_SIGNIN_KEY_ID` +
  `APPLE_SIGNIN_PRIVATE_KEY`). Accounts that last signed in with Apple on 1.1.0 have no stored token until they sign in again.
- **4.2.** A short screen recording attached to the review notes (push arriving, share/save sheet, camera post) helps reviewers.

## Sign-in, links and rating (1.1.0)

- **Google / LINE / Facebook:** the page asks Supabase for the provider URL with `redirectTo = https://samecor.com/auth/app-return`
  and calls `SamecorShell.openAuth(url)`. `ShellSignIn` opens it in `ASWebAuthenticationSession` (callback scheme
  `com.samecor.app`). Supabase lands on `/auth/app-return`, whose script jumps to `com.samecor.app://auth/callback?code=…`;
  the session catches it and the shell loads `https://samecor.com/auth/callback?code=…` in the web view, where the PKCE
  verifier lives. The same page handles password reset (`?to=reset-password`).
- **Sign in with Apple:** `SamecorShell.signInWithApple(sha256(nonce))` → Apple's sheet → identity token →
  `supabase.auth.signInWithIdToken({ provider: "apple", token, nonce })`. Needs the Supabase Apple provider with Client ID
  `com.samecor.app`, and **Sign In with Apple** ticked on the App ID.
- **Universal links:** `public/.well-known/apple-app-site-association` (team `ZD5YU7PP65`) lists the content pages that open in
  the app; auth, reset-password, `/go` and payment pages stay in Safari. The entitlement also has `webcredentials:samecor.com`,
  so iOS offers saved samecor.com passwords. Needs **Associated Domains** ticked on the App ID.
- **Rating:** `SamecorShell.requestReview()` → `AppStore.requestReview(in:)` (SKStoreReviewController before iOS 16), at the
  same moments the website shows its own star prompt (`RatingPrompt.tsx`). TestFlight never shows the sheet.
- **Feature list:** `SamecorShell.getFeatures()` tells the site what this build can do (`src/lib/nativeShell.ts`). Build 1.0.0
  has no list, so the site keeps its 1.0.0 behaviour there.

After ticking new capabilities on the App ID, delete the old App Store profile for `com.samecor.app` (Profiles) so Codemagic
creates one that includes them. Owner steps for the whole release: `../capacitor-shell/RELEASE_1.2_OWNER_STEPS.md`.

## Files in this folder

- `app-privacy.md`: draft answers for App Store Connect → App Privacy.
- `app-store-listing.md`: listing text (Thai and English) and screenshot sizes.
- `review-notes.md`: what to tell App Review, with the demo account.
