-- Thai ID only patch
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
  _address_json jsonb DEFAULT '{}'::jsonb,
  _date_of_birth date DEFAULT NULL,
  _nationality text DEFAULT 'TH',
  _pep_declaration boolean DEFAULT false,
  _sanctions_declaration boolean DEFAULT false,
  _submission_meta jsonb DEFAULT '{}'::jsonb
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
  id_type text := lower(trim(coalesce(_id_type, 'national_id')));
  nid text := regexp_replace(coalesce(_national_id_number, ''), '\D', '', 'g');
  phone_digits text := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
  age_years integer;
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

  -- Thai national ID only (no passport / foreign docs)
  IF id_type <> 'national_id' THEN
    RAISE EXCEPTION 'รองรับเฉพาะบัตรประชาชนไทย';
  END IF;

  IF upper(trim(coalesce(_nationality, 'TH'))) <> 'TH' THEN
    RAISE EXCEPTION 'รองรับเฉพาะสัญชาติไทย';
  END IF;

  IF _date_of_birth IS NULL THEN
    RAISE EXCEPTION 'กรุณาระบุวันเกิด';
  END IF;

  age_years := date_part('year', age(current_date, _date_of_birth))::integer;
  IF age_years < 18 OR age_years > 120 THEN
    RAISE EXCEPTION 'ต้องมีอายุอย่างน้อย 18 ปีบริบูรณ์';
  END IF;

  IF NOT coalesce(_pep_declaration, false) OR NOT coalesce(_sanctions_declaration, false) THEN
    RAISE EXCEPTION 'กรุณายืนยันสถานะ PEP และบัญชีลงโทษ';
  END IF;

  IF length(nid) <> 13 THEN
    RAISE EXCEPTION 'เลขบัตรประชาชนไม่ครบ 13 หลัก';
  END IF;

  IF phone_digits !~ '^0[0-9]{8,9}$' THEN
    RAISE EXCEPTION 'เบอร์โทรไม่ถูกต้อง';
  END IF;

  IF trim(coalesce(_legal_name, '')) = ''
     OR trim(coalesce(_bank_name, '')) = ''
     OR trim(coalesce(_account_number, '')) = ''
     OR trim(coalesce(_account_name, '')) = ''
     OR trim(coalesce(_contact_email, '')) = ''
     OR position('@' in trim(_contact_email)) = 0 THEN
    RAISE EXCEPTION 'กรุณากรอกข้อมูลให้ครบ';
  END IF;

  IF coalesce(_address_json->>'line1', '') = ''
     OR coalesce(_address_json->>'subdistrict', '') = ''
     OR coalesce(_address_json->>'district', '') = ''
     OR coalesce(_address_json->>'province', '') = ''
     OR length(coalesce(_address_json->>'postal_code', '')) < 5 THEN
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
    reject_reason_code, reject_reason_label,
    date_of_birth, nationality, pep_declaration, sanctions_declaration, submission_meta
  ) VALUES (
    uid, 'pending', coalesce(_contact_note, ''), trim(_legal_name), id_type,
    trim(_bank_name), trim(_account_number), trim(_account_name), now(),
    now(), '2026-07-24',
    nid, phone_digits, trim(_contact_email), coalesce(_address_json, '{}'::jsonb), now(),
    NULL, NULL,
    _date_of_birth, 'TH', true, true,
    coalesce(_submission_meta, '{}'::jsonb)
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

REVOKE ALL ON FUNCTION public.submit_kyc_verification(
  text, text, text, text, text, jsonb, text, text, text, text, jsonb, date, text, boolean, boolean, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_kyc_verification(
  text, text, text, text, text, jsonb, text, text, text, text, jsonb, date, text, boolean, boolean, jsonb
) TO authenticated;

