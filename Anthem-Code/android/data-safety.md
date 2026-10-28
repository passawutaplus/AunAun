# Google Play — Data safety form draft

Answers derived from what the code actually collects (Supabase tables, `src/lib/productEvents.ts`,
`src/components/seo/GoogleAnalytics.tsx`, `src/lib/errorMonitoring.ts`, KYC is hidden in the Android app — `isKycPath` in `src/lib/aplus1Launch.ts`).
Review before submitting: Play treats wrong answers as a policy violation.

## Overview questions

| Question | Answer |
|---|---|
| Does the app collect or share any required user data types? | **Yes** |
| Is all user data encrypted in transit? | **Yes** (HTTPS only; Supabase + Vercel) |
| Do you provide a way for users to request that their data is deleted? | **Yes** — in app (Settings → Privacy) and https://samecor.com/legal/delete-account |

## Data collected

"Optional" = the user can use the app without providing it.
None of this is **shared** in Play's sense: Supabase, Vercel, Google Sign-In and Sentry act as service providers on our behalf, which Play does not count as sharing.

| Play category → type | Collected | Optional? | Purpose | Source in the app |
|---|---|---|---|---|
| Personal info → Name | Yes | Required | Account management, App functionality | profile display name |
| Personal info → Email address | Yes | Required | Account management, Developer communications | sign-up / Google Sign-In |
| Personal info → User IDs | Yes | Required | Account management, App functionality | account id, username |
| Personal info → Address | Yes | Optional | App functionality | profile location (typed by the user) |
| Photos and videos → Photos | Yes | Optional | App functionality | project images, avatar |
| Photos and videos → Videos | Yes | Optional | App functionality | project videos |
| Messages → Other in-app messages | Yes | Optional | App functionality | chat |
| App activity → App interactions | Yes | Optional | Analytics | `product_events` (page views, likes, saves) — only with analytics consent |
| App activity → In-app search history | Yes | Optional | Analytics, App functionality | `feed_search` events, recent searches |
| App activity → Other user-generated content | Yes | Optional | App functionality | projects, comments, bio |
| App info and performance → Crash logs | Yes | Required | Analytics | Sentry (error reports: message, stack, page, browser/device type; no user PII sent) |
| App info and performance → Diagnostics | Yes | Optional | Analytics | in-app feedback diagnostics |
| Device or other IDs | Yes | Optional | App functionality | push subscription endpoint + keys (`shared.push_subscriptions`) — only after the user turns on notifications; removed on turn-off / sign-out |

**Not collected in the Android app:** identity documents, national ID, phone number, bank account (KYC is hidden in the app); precise or approximate device location, contacts, calendar, health, audio, files outside what the user uploads, web browsing history, purchase history (commerce is off in the Android app).

## To confirm before submitting

Checked 2026-10-28 against the live samecor.com bundle: **neither GA4 nor Sentry is configured** (no `G-…` id, no gtag loader, no Sentry DSN).

1. `VITE_GA_MEASUREMENT_ID` — not set. Nothing to declare for GA. If it is turned on later, update this form first; add **App interactions → shared with Google (Analytics)** only if GA data sharing settings send data beyond service-provider use.
2. `VITE_SENTRY_DSN` — **set on 2026-10-28** (Vercel `aplus1-prod`, production + preview; Sentry org `samecor`, project javascript-react). Keep the Crash logs row. Errors are tagged `shell` = android / pwa / web.
