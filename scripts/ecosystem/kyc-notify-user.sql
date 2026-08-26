-- In-app KYC result notification. Email is sent by the notify-kyc edge function
-- (Resend) after admin_approve_kyc / admin_reject_kyc.
-- Apply via: node scripts/ecosystem/apply-kyc-migration.mjs kyc-notify-user.sql

CREATE OR REPLACE FUNCTION public.notify_kyc_user(
  _user_id uuid,
  _kind text,
  _title text,
  _body text,
  _link text DEFAULT '/verify'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shared', 'public'
AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata, is_read, is_dismissed)
  VALUES (_user_id, 'anthem', _kind, _title, _body, _link, '{}'::jsonb, false, false);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_kyc_user(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_kyc_user(uuid, text, text, text, text) TO service_role;
