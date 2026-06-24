# Android And iOS Store Readiness

The web app now includes a PWA manifest, service worker, offline fallback, app icons, a Capacitor configuration, and a mobile Playwright project. Native Android and iOS projects are not generated yet.

## Native Build Steps

1. Install Capacitor core, CLI, Android, and iOS packages.
2. Run the production web build.
3. Add and sync Android and iOS projects.
4. Configure app links, OAuth callbacks, push certificates, signing, and release versioning.
5. Test on physical Android and iPhone devices before store submission.

Run `npm run mobile:doctor` to verify repository assets.

## Digital Purchases

External Stripe checkout for Pixel top-ups, subscriptions, and boosts is blocked when the code runs inside a native shell. Do not remove this guard until the store-compliant purchase design is approved and implemented.

Cashout and creator payouts are separate from buying digital content and require their own legal, KYC, and operational review.

## Store Review Gate

- Account deletion is available inside the app.
- Privacy policy and terms are publicly reachable.
- Reviewer credentials use the isolated demo project.
- Camera/photo permissions have clear usage descriptions.
- Push notification permission is requested only after user intent.
- Universal/App Links open the correct route.
- OAuth returns to the app without losing session state.
- No production secret or service-role key exists in the app bundle.
- All top-up, subscription, and boost purchase paths are absent or disabled in native builds.
- Crash reporting and release health dashboards are active.

## Required Store Assets

- App icon and adaptive Android icon.
- Phone screenshots for current required sizes.
- Feature graphic for Google Play.
- Privacy/data-safety answers matching actual Supabase, Sentry, Stripe, Google, LINE, and push usage.
- Support URL, privacy URL, marketing URL, and reviewer notes.

