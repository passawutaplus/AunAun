-- Chat pictures are deleted 30 days after they were sent: every day 03:30 Bangkok (20:30 UTC). Run once, AFTER
-- deploying the edge function `chat-media-expire` (verify_jwt = false).
-- Uses the Vault secret `push_dispatch_secret` that already exists (send-push / weekly-digest use it), so no new secret.
-- Safe to run again (replaces the function and the job). Turn it off: SELECT cron.unschedule('samecor-chat-media-expire');

-- What the cron calls (pg_net → edge function), same as anthem.run_weekly_digest().
CREATE OR REPLACE FUNCTION anthem.run_chat_media_expire()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT s.decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets s
   WHERE s.name = 'push_dispatch_secret'
   LIMIT 1;
  IF v_secret IS NULL THEN
    RAISE WARNING 'chat media expire: no secret in vault — skipped';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://zkflkpbmbozrchqncpzi.supabase.co/functions/v1/chat-media-expire',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
END;
$$;

REVOKE ALL ON FUNCTION anthem.run_chat_media_expire() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'samecor-chat-media-expire';
SELECT cron.schedule('samecor-chat-media-expire', '30 20 * * *', 'select anthem.run_chat_media_expire()');

-- Check: one row, schedule "30 20 * * *", active true.
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'samecor-chat-media-expire';
