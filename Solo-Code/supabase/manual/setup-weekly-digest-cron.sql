-- Weekly summary e-mail: every Monday 09:00 Bangkok (02:00 UTC). Run once, AFTER
--   1. migration 20261129120000_redesign_weekly_email.sql, and
--   2. deploying the edge function `weekly-digest` (verify_jwt = false).
-- Uses the Vault secret `push_dispatch_secret` that already exists (send-push uses it), so no new secret is needed.
-- Safe to run again (replaces the job). Turn it off: SELECT cron.unschedule('samecor-weekly-digest');

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'samecor-weekly-digest';
SELECT cron.schedule('samecor-weekly-digest', '0 2 * * 1', 'select anthem.run_weekly_digest()');

-- Check: one row, schedule "0 2 * * 1".
SELECT jobname, schedule, command, active FROM cron.job WHERE jobname = 'samecor-weekly-digest';
