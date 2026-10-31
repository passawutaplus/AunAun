-- Web push for SAMECOR (browser, installed PWA and the Android app / TWA).
-- Every row inserted into shared.notifications is forwarded to the `send-push` edge function,
-- which delivers it to the recipient's registered devices.
--
-- Needs (owner, once):
--   1. Edge function secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_DISPATCH_SECRET
--   2. Vault secret with the same dispatch value:
--        select vault.create_secret('<same value as PUSH_DISPATCH_SECRET>', 'push_dispatch_secret');
-- Until the vault secret exists the trigger is a no-op, so applying this early is safe.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS shared.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  shell text NOT NULL DEFAULT 'web' CHECK (shell IN ('web', 'pwa', 'android')),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON shared.push_subscriptions (user_id);

-- No client policies: devices are registered through the RPCs below, read only by the edge function.
ALTER TABLE shared.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.save_push_subscription(
  _endpoint text,
  _p256dh text,
  _auth text,
  _shell text DEFAULT 'web',
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  IF coalesce(_endpoint, '') !~ '^https://' OR length(_endpoint) > 1000
     OR coalesce(_p256dh, '') = '' OR coalesce(_auth, '') = '' THEN
    RAISE EXCEPTION 'INVALID_SUBSCRIPTION';
  END IF;

  INSERT INTO shared.push_subscriptions (user_id, endpoint, p256dh, auth, shell, user_agent)
  VALUES (
    uid, _endpoint, _p256dh, _auth,
    CASE WHEN _shell IN ('web', 'pwa', 'android') THEN _shell ELSE 'web' END,
    left(_user_agent, 300)
  )
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        shell = EXCLUDED.shell,
        user_agent = EXCLUDED.user_agent,
        failure_count = 0;
END $$;

CREATE OR REPLACE FUNCTION public.remove_push_subscription(_endpoint text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  DELETE FROM shared.push_subscriptions WHERE endpoint = _endpoint AND user_id = auth.uid();
END $$;

REVOKE EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_push_subscription(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_push_subscription(text) TO authenticated;

-- Forward each new notification to send-push. Never blocks or fails the insert.
CREATE OR REPLACE FUNCTION shared.dispatch_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret text;
BEGIN
  IF NEW.app IS DISTINCT FROM 'anthem' THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM shared.push_subscriptions s WHERE s.user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'push_dispatch_secret' LIMIT 1;
  IF v_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://zkflkpbmbozrchqncpzi.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', v_secret),
    body := jsonb_build_object('notification_id', NEW.id),
    timeout_milliseconds := 10000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'dispatch_push_notification skipped: %', SQLERRM;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION shared.dispatch_push_notification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notifications_dispatch_push ON shared.notifications;
CREATE TRIGGER notifications_dispatch_push
  AFTER INSERT ON shared.notifications
  FOR EACH ROW EXECUTE FUNCTION shared.dispatch_push_notification();
