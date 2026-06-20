-- KYC v2: full identity fields, user attestation, structured reject reasons, notifications

DROP FUNCTION IF EXISTS public.submit_kyc_verification(text, text, text, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.admin_reject_kyc(uuid, text);

ALTER TABLE shared.kyc_requests
  ADD COLUMN IF NOT EXISTS national_id_number text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS address_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS user_attestation_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason_code text,
  ADD COLUMN IF NOT EXISTS reject_reason_label text;

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
SET search_path = shared, public
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
GRANT EXECUTE ON FUNCTION public.notify_kyc_user(uuid, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_kyc_verification(
  _legal_name text,
  _id_type text,
  _bank_name text,
  _account_number text,
  _account_name text,
  _documents jsonb,
  _contact_note text DEFAULT '',
  _national_id_number text DEFAULT '',
  _phone text DEFAULT '',
  _contact_email text DEFAULT '',
  _address_json jsonb DEFAULT '{}'::jsonb
)
RETURNS shared.kyc_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  req shared.kyc_requests;
  doc jsonb;
  has_front boolean := false;
  has_back boolean := false;
  has_selfie boolean := false;
  has_bank_book boolean := false;
  dup_bank boolean := false;
  ai record;
  nid text := regexp_replace(coalesce(_national_id_number, ''), '\D', '', 'g');
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อน';
  END IF;

  IF EXISTS (
    SELECT 1 FROM shared.kyc_requests
    WHERE user_id = uid AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'มีคำขอที่รอตรวจสอบอยู่แล้ว';
  END IF;

  IF trim(coalesce(_legal_name, '')) = ''
     OR trim(coalesce(_bank_name, '')) = ''
     OR trim(coalesce(_account_number, '')) = ''
     OR trim(coalesce(_account_name, '')) = ''
     OR length(nid) <> 13
     OR trim(coalesce(_phone, '')) = ''
     OR trim(coalesce(_contact_email, '')) = '' THEN
    RAISE EXCEPTION 'กรุณากรอกข้อมูลให้ครบ';
  END IF;

  IF coalesce(_address_json->>'line1', '') = ''
     OR coalesce(_address_json->>'district', '') = ''
     OR coalesce(_address_json->>'province', '') = ''
     OR coalesce(_address_json->>'postal_code', '') = '' THEN
    RAISE EXCEPTION 'กรุณากรอกที่อยู่ให้ครบ';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM shared.kyc_requests r
    WHERE r.user_id <> uid
      AND r.status = 'approved'
      AND r.account_number = trim(_account_number)
  ) INTO dup_bank;

  INSERT INTO shared.kyc_requests (
    user_id, status, contact_note, legal_name, id_type,
    bank_name, account_number, account_name, submitted_at,
    pdpa_consent_at, pdpa_consent_version,
    national_id_number, phone, contact_email, address_json, user_attestation_at,
    reject_reason_code, reject_reason_label
  ) VALUES (
    uid, 'pending', coalesce(_contact_note, ''), trim(_legal_name), coalesce(_id_type, 'national_id'),
    trim(_bank_name), trim(_account_number), trim(_account_name), now(),
    now(), '2026-06-19',
    nid, trim(_phone), trim(_contact_email), coalesce(_address_json, '{}'::jsonb), now(),
    NULL, NULL
  )
  RETURNING * INTO req;

  FOR doc IN SELECT * FROM jsonb_array_elements(coalesce(_documents, '[]'::jsonb))
  LOOP
    INSERT INTO shared.kyc_documents (request_id, user_id, doc_type, storage_path)
    VALUES (req.id, uid, doc->>'doc_type', doc->>'storage_path')
    ON CONFLICT (request_id, doc_type) DO UPDATE
      SET storage_path = EXCLUDED.storage_path;
    IF doc->>'doc_type' = 'id_front' THEN has_front := true; END IF;
    IF doc->>'doc_type' = 'id_back' THEN has_back := true; END IF;
    IF doc->>'doc_type' = 'selfie' THEN has_selfie := true; END IF;
    IF doc->>'doc_type' = 'bank_book' THEN has_bank_book := true; END IF;
  END LOOP;

  IF NOT (has_front AND has_back AND has_selfie AND has_bank_book) THEN
    RAISE EXCEPTION 'กรุณาอัปโหลดเอกสารให้ครบ (บัตรหน้า-หลัง, selfie, สมุดบัญชี)';
  END IF;

  SELECT * INTO ai FROM public.kyc_ai_score(
    _legal_name, _account_name, has_front, has_back, has_selfie, dup_bank
  );

  UPDATE shared.kyc_requests
     SET ai_risk_score = ai.risk_score,
         ai_summary = ai.summary,
         ai_recommendation = ai.recommendation,
         ai_reviewed_at = now()
   WHERE id = req.id
   RETURNING * INTO req;

  RETURN req;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_kyc_verification(text, text, text, text, text, jsonb, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_kyc_verification(text, text, text, text, text, jsonb, text, text, text, text, jsonb) TO authenticated;

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
         reviewed_by = auth.uid(),
         reject_reason_code = NULL,
         reject_reason_label = NULL
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

  UPDATE public.profiles SET is_verified = true WHERE user_id = req.user_id;

  PERFORM public.log_admin_audit(
    'kyc.approve', 'kyc_request', _request_id::text,
    jsonb_build_object('subject_user_id', req.user_id)
  );

  PERFORM public.notify_kyc_user(
    req.user_id,
    'kyc_approved',
    'ยืนยันตัวตนสำเร็จ',
    'คำขอยืนยันตัวตนของคุณได้รับการอนุมัติแล้ว — ถอนเงินได้เมื่อครบเงื่อนไขผู้ติดตาม',
    '/verify'
  );

  RETURN req;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_kyc(
  _request_id uuid,
  _note text DEFAULT '',
  _reason_code text DEFAULT 'other',
  _reason_label text DEFAULT ''
)
RETURNS shared.kyc_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  req shared.kyc_requests;
  label text := coalesce(nullif(trim(_reason_label), ''), 'ไม่ผ่านการตรวจสอบ');
  body text;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  IF coalesce(_reason_code, '') = 'other' AND trim(coalesce(_note, '')) = '' THEN
    RAISE EXCEPTION 'กรุณาระบุเหตุผลเมื่อเลือก อื่นๆ';
  END IF;

  UPDATE shared.kyc_requests
     SET status = 'rejected',
         admin_note = coalesce(_note, ''),
         reject_reason_code = coalesce(_reason_code, 'other'),
         reject_reason_label = label,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   WHERE id = _request_id AND status = 'pending'
   RETURNING * INTO req;

  IF req.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบคำขอหรือสถานะไม่ถูกต้อง';
  END IF;

  body := label;
  IF trim(coalesce(_note, '')) <> '' THEN
    body := body || ' — ' || trim(_note);
  END IF;
  body := body || ' คุณสามารถยื่นคำขอใหม่ได้ที่หน้ายืนยันตัวตน';

  PERFORM public.log_admin_audit(
    'kyc.reject', 'kyc_request', _request_id::text,
    jsonb_build_object('subject_user_id', req.user_id, 'reason_code', _reason_code)
  );

  PERFORM public.notify_kyc_user(
    req.user_id,
    'kyc_rejected',
    'คำขอยืนยันตัวตนไม่ผ่าน',
    body,
    '/verify'
  );

  RETURN req;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_kyc(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_kyc(uuid, text, text, text) TO authenticated;
