-- Fix for 20261120100000_android_fcm_tokens.sql: Postgres regex bounds stop at 255, so the token check
-- '{32,4096}' raised "invalid repetition count(s)" and every save_fcm_token call failed with HTTP 400
-- (Android app 1.2.0 showed "เปิดแจ้งเตือนไม่สำเร็จ"). The length is now checked separately.

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
  IF length(v_token) NOT BETWEEN 32 AND 4096 OR v_token !~ '^[A-Za-z0-9_:-]+$' THEN
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
