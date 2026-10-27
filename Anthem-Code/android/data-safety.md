# Google Play — Data safety form draft

Answers derived from what the code actually collects (Supabase tables, `src/lib/productEvents.ts`,
`src/components/seo/GoogleAnalytics.tsx`, `src/lib/errorMonitoring.ts`, KYC in `submit_kyc_verification`).
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
| Personal info → Phone number | Yes | Optional | Fraud prevention, security and compliance | identity verification (KYC) |
| Personal info → Other info | Yes | Optional | Fraud prevention, security and compliance | KYC: national ID number, date of birth |
| Financial info → Other financial info | Yes | Optional | App functionality, Fraud prevention | KYC / payout bank account |
| Photos and videos → Photos | Yes | Optional | App functionality | project images, avatar, KYC documents |
| Photos and videos → Videos | Yes | Optional | App functionality | project videos |
| Messages → Other in-app messages | Yes | Optional | App functionality | chat |
| App activity → App interactions | Yes | Optional | Analytics | `product_events` (page views, likes, saves) — only with analytics consent |
| App activity → In-app search history | Yes | Optional | Analytics, App functionality | `feed_search` events, recent searches |
| App activity → Other user-generated content | Yes | Optional | App functionality | projects, comments, bio |
| App info and performance → Crash logs | Yes* | Optional | Analytics | Sentry, *only if `VITE_SENTRY_DSN` is set in production |
| App info and performance → Diagnostics | Yes | Optional | Analytics | in-app feedback diagnostics |

**Not collected:** precise or approximate device location, contacts, calendar, health, audio, files outside what the user uploads, web browsing history, purchase history (commerce is off in the Android app).

## To confirm before submitting

1. Is `VITE_GA_MEASUREMENT_ID` set in production? If yes, Google Analytics runs after cookie consent — add **App interactions → shared with Google (Analytics)** only if GA data sharing settings send data beyond service-provider use.
2. Is `VITE_SENTRY_DSN` set in production? If not, remove the Crash logs row.
3. KYC (`/verify`) is reachable in the launch build. If payouts stay off at launch, consider hiding `/verify` in the Android app so the Phone / Other info / Financial rows can be dropped.
