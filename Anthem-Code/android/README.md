# SAMECOR Android app (TWA)

This wraps the existing PWA (manifest.webmanifest + sw.js, already shipping on
samecor.com) as a Trusted Web Activity — a thin Android shell that opens the
live site full-screen, no browser chrome. Not a rewrite.

## What's already done

- `twa-manifest.json` — bubblewrap config, pre-filled with the brand colors,
  icons and host. Points at `https://samecor.com/manifest.webmanifest`.
- `public/.well-known/assetlinks.json` — placeholder; the real
  `sha256_cert_fingerprints` value gets filled in step 2 below.
- `vercel.json` — fixed so `/.well-known/assetlinks.json` is served as a
  static file instead of being swallowed by the SPA catch-all rewrite (it
  wasn't excluded before — would have 404'd the asset-link check).

## What's left (needs a machine with Android SDK + your own signing key)

1. **Install the Android SDK command-line tools** (or open Android Studio once
   to let it install them). Bubblewrap can also fetch a JDK/SDK itself on
   first run if asked.

2. **Generate the app and signing keystore:**
   ```bash
   cd android
   npx @bubblewrap/cli build
   ```
   This reads `twa-manifest.json`, and on first run asks you to create a
   keystore — **pick your own password and store it somewhere safe** (a
   password manager). This key signs every future update to the app; losing
   it means you can never update this app listing again, only publish a new
   one.

3. **Fill both fingerprints into `public/.well-known/assetlinks.json`**, then
   deploy so `https://samecor.com/.well-known/assetlinks.json` serves them:
   - `REPLACE_WITH_UPLOAD_KEY_SHA256_FROM_BUBBLEWRAP` — printed by
     `bubblewrap build` (or `keytool -list -v -keystore android.keystore`).
   - `REPLACE_WITH_PLAY_APP_SIGNING_KEY_SHA256_FROM_PLAY_CONSOLE` — Play
     Console → your app → Test and release → App integrity → App signing.
     Google re-signs the app with this key, so without it the installed app
     shows a URL bar instead of running full-screen.

4. **Google Play Console account** — $25 one-time, your own card:
   https://play.google.com/console/signup

5. Upload the `.aab` bubblewrap built (in `android/app/build/outputs/bundle/`)
   to Play Console, fill in the store listing (screenshots, description,
   privacy policy — `https://samecor.com/legal/privacy`), submit for review.
   Usually a few hours to ~2 days.

## Drafts ready for Play Console

- `play-store-listing.md` — app name, short/full description (TH + EN),
  category, content-rating answers, target audience, graphics checklist.
- `data-safety.md` — Data safety form answers, with three items to confirm.

## What the web app does differently inside the Android app

- `src/lib/appShell.ts` detects the app (start URL `/?source=android`, kept in
  sessionStorage) and keeps the status-bar colour in step with light/dark.
- Commerce, PX/gifts, boosts and subscriptions are switched off in the app
  (`src/lib/aplus1Launch.ts`) — Play requires digital goods to go through
  Play Billing.
- Google sign-in uses a full-page redirect instead of a popup in the app.
- Analytics events carry `shell: "android" | "pwa" | "web"`.

## Icons already meet Play Store requirements

- 512×512 icon: `public/icons/icon-512.png`
- Maskable 512×512: `public/icons/icon-maskable-512.png`
- 192×192: `public/icons/icon-192.png`

Screenshots for the store listing are not prepared yet — those need to come
from a real device/emulator running the built app, or phone screenshots of
the live site in standalone/PWA mode.
