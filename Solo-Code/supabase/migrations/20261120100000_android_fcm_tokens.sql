-- Push for the SAMECOR Android app from version 1.2.0 (Capacitor shell, Anthem-Code/capacitor-shell/android).
-- Android's WebView has no Web Push, so the app registers a Firebase Cloud Messaging (FCM) token instead. It is
-- stored in shared.push_subscriptions next to the web and iOS rows:
--   endpoint = 'fcm:<token>', p256dh = auth = 'fcm', shell = 'android'
-- send-push (Solo-Code/supabase/functions/send-push) sends 'fcm:' rows through FCM HTTP v1 (_shared/fcm.ts).
-- remove_push_subscription('fcm:<token>') removes a token, the same way as a web endpoint.
--
-- Needs (owner, once): edge function secret FCM_SERVICE_ACCOUNT (the Firebase service account JSON).
-- Without it send-push skips 'fcm:' rows.

CREATE OR REPLACE FUNCTION public.save_fcm_token(_token text, _user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  v_token text := coalesce(_token, '');
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  -- FCM registration tokens are opaque URL-safe strings (about 160 characters today).
  IF v_token !~ '^[A-Za-z0-9_:\-]{32,4096}$' THEN
    RAISE EXCEPTION 'INVALID_TOKEN';
  END IF;

  INSERT INTO shared.push_subscriptions (user_id, endpoint, p256dh, auth, shell, user_agent)
  VALUES (uid, 'fcm:' || v_token, 'fcm', 'fcm', 'android', left(_user_agent, 300))
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        shell = 'android',
        user_agent = EXCLUDED.user_agent,
        failure_count = 0;
END $$;

REVOKE EXECUTE ON FUNCTION public.save_fcm_token(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_fcm_token(text, text) TO authenticated;
