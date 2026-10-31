-- Daily win-back email run (10:00 Asia/Bangkok = 03:00 UTC).
-- Needs: pg_net, a Vault secret named `churn_email_secret` equal to the edge function's
-- CHURN_EMAIL_SECRET, and the anthem-churn-email function deployed.
--   select vault.create_secret('<same value as CHURN_EMAIL_SECRET>', 'churn_email_secret');

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION anthem.run_churn_email()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'public'
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'churn_email_secret' LIMIT 1;
  IF v_secret IS NULL THEN
    RAISE WARNING 'churn_email_secret missing in vault — skipped';
    RETURN NULL;
  END IF;
  RETURN net.http_post(
    url := 'https://zkflkpbmbozrchqncpzi.supabase.co/functions/v1/anthem-churn-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', v_secret),
    body := jsonb_build_object('limit', 50),
    timeout_milliseconds := 60000
  );
END $$;

REVOKE EXECUTE ON FUNCTION anthem.run_churn_email() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'anthem-churn-email';
SELECT cron.schedule('anthem-churn-email', '0 3 * * *', 'select anthem.run_churn_email()');
