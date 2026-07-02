# Anthem Production Readiness

This document is the release gate for the community platform. A successful frontend build alone is not a production release.

## Required Before Launch

1. Choose one canonical production domain and use it consistently in `VITE_SITE_URL`, OAuth redirects, sitemap, robots, email links, universal links, and store listings. The repository currently contains both `pixel100.com` and `an1hem.app`.
2. Apply all `Solo-Code/supabase/migrations` in timestamp order. The shared Supabase backend is owned by Solo-Code.
3. Confirm `20260622120000_anthem_community_production_hardening.sql` completed successfully.
4. Confirm `20260622160000_anthem_referral_affiliate.sql` completed successfully before enabling referral links.
5. Confirm `20260702120000_kuy_radar_core.sql` completed successfully before enabling Kuy Radar persistence (RLS uses `has_role(auth.uid(), 'admin')`).
6. Disable every mock payment RPC and use Stripe live-mode secrets only in server environments.
7. Set production `VITE_DEMO_MODE=false`.
8. Configure Sentry, uptime monitoring, database backups, and a tested restore procedure.
9. Replace or confirm all public support, privacy, and security email addresses.

## Community And Chat Scale

The hardening migration adds:

- Server-side post, comment, and message rate limits.
- Transaction locks for concurrent writes from the same account.
- Moderation state, strikes, mute, and ban enforcement in Postgres.
- Protected counters and idempotent community notifications.
- Daily unique authenticated view counting.
- Feed, comment, and message indexes.
- Atomic group conversation creation.
- Server-maintained conversation activity timestamps.
- Realtime publication for posts, comments, and likes.

The frontend now pages the community feed and bounds chat history. Do not change these queries back to unbounded reads.

## Load Test Gate

Run against a non-production Supabase project:

- 200 concurrent feed readers for 10 minutes.
- 50 concurrent comment writers across at least 20 posts.
- 100 concurrent chat users across at least 30 conversations.
- Burst tests that confirm post, comment, and message limits reject excess traffic.
- Reconnect tests after disabling network for 30 seconds.

Pass criteria:

- p95 feed query below 800 ms.
- p95 message insert below 500 ms.
- Error rate below 1%, excluding deliberate rate-limit responses.
- No duplicate notifications, negative counters, orphan group chats, or cross-user data exposure.

## Supabase Operations

- Use Supavisor/connection pooling for application traffic.
- Keep service-role keys only in server/Edge Function environments.
- Review slow queries and index usage after the first real traffic.
- Add read replicas only after measuring read pressure; replicas do not fix unbounded queries.
- Set budget and alert thresholds for database size, egress, Realtime connections, and storage.

## Rollback

1. Keep the previous frontend deployment available.
2. Pause writes with a maintenance banner if a database migration fails.
3. Roll back frontend first. Avoid destructive down migrations on user content.
4. Restore from a verified backup only for data corruption, not ordinary application bugs.
