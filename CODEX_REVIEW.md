# Codex Security and Code Review

Review date: 2026-06-22

## High-priority changes applied

1. Disabled browser access to mock credit top-ups and mock ad payments in production.
   Trusted `service_role` processes retain access. Demo access must be enabled explicitly.
2. Removed `unsafe-inline` and `unsafe-eval` from Anthem's production `script-src` CSP.
3. Added fail-fast validation for required Supabase settings in Anthem Ops access.
4. Prevented an older `getSession()` result from overwriting a newer Anthem auth event.
5. Added ignores for Playwright reports, test output, and TypeScript build caches.
6. Hardened Ops Hub environment validation, auth-role race handling, CSP, and mock top-ups.
7. Isolated reviewer demo builds from the production Supabase project and removed demo
   passwords from the public browser bundle, scripts, docs, and seed migrations.
8. Added database-enforced moderation, rate limits, protected counters, idempotent
   notifications, pagination indexes, and Realtime publication for the community.
9. Bounded community and chat queries, added feed pagination, and made group chat creation
   atomic.
10. Removed direct message updates from authenticated clients. Read receipts and unsend now
    use ownership-checked database functions.
11. Added PWA assets, offline fallback, Capacitor configuration, mobile smoke-test setup,
    and native-store guards for external digital purchases.
12. Added transaction-safe Referral and Affiliate rewards with confirmed-email attribution,
    first-content qualification, non-withdrawable new-user incentives, withdrawable referrer
    earnings, immutable reward ledgers, RLS, and duplicate-payment protection.

## Review results

- No committed private key, Supabase service-role key, Stripe secret key, or GitHub token
  was found by the repository secret scan.
- Public Supabase and Stripe publishable values in examples are client-safe, but real
  server secrets must remain outside Git.
- HTML rendered from blog content is sanitized. Meeting report Markdown is HTML-escaped.
- Several Supabase functions intentionally use `SECURITY DEFINER`; their ownership/admin
  checks must remain covered by database tests whenever those functions change.
- Public token portals and anonymous event endpoints should also be protected by
  deployment-level rate limiting.
- The repository contains both `pixel100.com` and `an1hem.app`; choose one canonical
  production domain before release and update SEO, OAuth, email, and store configuration.
- Server-side profanity classification still needs a maintained moderation service or
  database rule set. Current server enforcement covers bans, mutes, length, and rate limits.

## Verification

- Ops Hub TypeScript check: passed.
- Anthem syntax parse: passed for 559 TypeScript/TSX files.
- Anthem PWA/Capacitor asset doctor: passed.
- Anthem and Solo full typecheck/build/test runs were not completed after the final changes
  because external package downloads were blocked and the offline npm cache was missing
  `zustand@5.0.13` and `zwitch@2.0.4`.
- Dependency audit for Ops Hub: no known npm vulnerabilities at review time.
- Run `npm install`, `npm run test`, `npm run lint`, and `npm run build` inside Solo and
  Anthem in CI or a network-enabled development machine before production deployment.
