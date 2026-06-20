-- KYC PDPA audit trail: tamper-resistant admin access logging

CREATE OR REPLACE FUNCTION public.log_admin_audit(
  _action text,
  _target_type text,
  _target_id text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    _action,
    _target_type,
    _target_id,
    coalesce(_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_audit(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_admin_audit(text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_log_kyc_access(
  _request_id uuid,
  _event text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  req shared.kyc_requests;
  meta jsonb;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  SELECT * INTO req FROM shared.kyc_requests WHERE id = _request_id;
  IF req.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบคำขอ KYC';
  END IF;

  meta := coalesce(_metadata, '{}'::jsonb) || jsonb_build_object(
    'event', _event,
    'subject_user_id', req.user_id,
    'kyc_status', req.status
  );

  PERFORM public.log_admin_audit(
    'kyc.' || _event,
    'kyc_request',
    _request_id::text,
    meta
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_log_kyc_access(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_log_kyc_access(uuid, text, jsonb) TO authenticated;

-- Re-create approve/reject with audit logging
CREATE OR REPLACE FUNCTION public.admin_approve_kyc(_request_id uuid, _note text DEFAULT '')
RETURNS shared.kyc_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  req shared.kyc_requests;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  UPDATE shared.kyc_requests
     SET status = 'approved',
         admin_note = coalesce(_note, ''),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   WHERE id = _request_id AND status = 'pending'
   RETURNING * INTO req;

  IF req.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบคำขอหรือสถานะไม่ถูกต้อง';
  END IF;

  INSERT INTO shared.payout_profiles (user_id, bank_name, account_number, account_name, verified_at, updated_at)
  VALUES (req.user_id, req.bank_name, req.account_number, req.account_name, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET bank_name = EXCLUDED.bank_name,
        account_number = EXCLUDED.account_number,
        account_name = EXCLUDED.account_name,
        verified_at = now(),
        updated_at = now();

  UPDATE public.profiles
     SET is_verified = true
   WHERE user_id = req.user_id;

  PERFORM public.log_admin_audit(
    'kyc.approve',
    'kyc_request',
    _request_id::text,
    jsonb_build_object('subject_user_id', req.user_id, 'has_note', coalesce(_note, '') <> '')
  );

  RETURN req;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_kyc(_request_id uuid, _note text DEFAULT '')
RETURNS shared.kyc_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  req shared.kyc_requests;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  UPDATE shared.kyc_requests
     SET status = 'rejected',
         admin_note = coalesce(_note, ''),
         reviewed_at = now(),
         reviewed_by = auth.uid()
   WHERE id = _request_id AND status = 'pending'
   RETURNING * INTO req;

  IF req.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบคำขอหรือสถานะไม่ถูกต้อง';
  END IF;

  PERFORM public.log_admin_audit(
    'kyc.reject',
    'kyc_request',
    _request_id::text,
    jsonb_build_object('subject_user_id', req.user_id, 'has_note', coalesce(_note, '') <> '')
  );

  RETURN req;
END;
$$;
