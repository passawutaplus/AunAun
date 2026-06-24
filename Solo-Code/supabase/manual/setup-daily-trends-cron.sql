-- Setup daily trends cron (05:00 ICT = 22:00 UTC)
-- Run once after deploy. Replace placeholders before executing.

-- 1. Vault secrets (upsert via Supabase dashboard SQL or Management API)
-- SELECT vault.create_secret('<SERVICE_ROLE_KEY>', 'cron_service_role_key');
-- SELECT vault.create_secret('https://solofreelancer.com', 'cron_app_url');

-- 2. Unschedule existing job if re-running
DO $$
BEGIN
  PERFORM cron.unschedule('fetch-daily-trends')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fetch-daily-trends');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Schedule daily fetch
SELECT cron.schedule(
  'fetch-daily-trends',
  '0 22 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_app_url')
           || '/api/public/cron/fetch-daily-trends',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
