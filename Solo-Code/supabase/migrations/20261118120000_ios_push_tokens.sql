-- Push for the SAMECOR iOS app (Capacitor shell, Anthem-Code/capacitor-shell/ios).
-- WKWebView has no Web Push, so the app registers an APNs device token instead. It is stored in
-- shared.push_subscriptions next to the web subscriptions:
--   endpoint = 'apns:<hex token>', p256dh = auth = 'apns', shell = 'ios'
-- send-push (Solo-Code/supabase/functions/send-push) sends rows with shell 'ios' through APNs.
-- remove_push_subscription('apns:<token>') removes a token, the same way as a web endpoint.
--
-- Needs (owner, once): edge function secrets APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (.p8 contents),
-- optional APNS_TOPIC (default com.samecor.app). Without them send-push skips iOS rows.

ALTER TABLE shared.push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_shell_check;
ALTER TABLE shared.push_subscriptions
  ADD CONSTRAINT push_subscriptions_shell_check CHECK (shell IN ('web', 'pwa', 'android', 'ios'));

CREATE OR REPLACE FUNCTION public.save_apns_token(_token text, _user_agent text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
  v_token text := lower(coalesce(_token, ''));
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  -- APNs tokens are hex strings (64 characters today; Apple says not to assume a fixed length).
  IF v_token !~ '^[0-9a-f]{32,200}$' THEN
    RAISE EXCEPTION 'INVALID_TOKEN';
  END IF;

  INSERT INTO shared.push_subscriptions (user_id, endpoint, p256dh, auth, shell, user_agent)
  VALUES (uid, 'apns:' || v_token, 'apns', 'apns', 'ios', left(_user_agent, 300))
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        shell = 'ios',
        user_agent = EXCLUDED.user_agent,
        failure_count = 0;
END $$;

REVOKE EXECUTE ON FUNCTION public.save_apns_token(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_apns_token(text, text) TO authenticated;
