-- PDPA compliance for KYC: consent audit trail + private storage paths

ALTER TABLE shared.kyc_requests
  ADD COLUMN IF NOT EXISTS pdpa_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pdpa_consent_version text;

CREATE OR REPLACE FUNCTION public.submit_kyc_verification(
  _legal_name text,
  _id_type text,
  _bank_name text,
  _account_number text,
  _account_name text,
  _documents jsonb,
  _contact_note text DEFAULT ''
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
  dup_bank boolean := false;
  ai record;
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
     OR trim(coalesce(_account_name, '')) = '' THEN
    RAISE EXCEPTION 'กรุณากรอกข้อมูลให้ครบ';
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
    pdpa_consent_at, pdpa_consent_version
  ) VALUES (
    uid, 'pending', coalesce(_contact_note, ''), trim(_legal_name), coalesce(_id_type, 'national_id'),
    trim(_bank_name), trim(_account_number), trim(_account_name), now(),
    now(), '2026-06-19'
  )
  RETURNING * INTO req;

  FOR doc IN SELECT * FROM jsonb_array_elements(coalesce(_documents, '[]'::jsonb))
  LOOP
    INSERT INTO shared.kyc_documents (request_id, user_id, doc_type, storage_path)
    VALUES (
      req.id,
      uid,
      doc->>'doc_type',
      doc->>'storage_path'
    )
    ON CONFLICT (request_id, doc_type) DO UPDATE
      SET storage_path = EXCLUDED.storage_path;
    IF doc->>'doc_type' = 'id_front' THEN has_front := true; END IF;
    IF doc->>'doc_type' = 'id_back' THEN has_back := true; END IF;
    IF doc->>'doc_type' = 'selfie' THEN has_selfie := true; END IF;
  END LOOP;

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

-- KYC files: private paths under project-media/anthem/kyc/{user_id}/
DROP POLICY IF EXISTS "kyc owner upload" ON storage.objects;
CREATE POLICY "kyc owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] = 'kyc'
    AND (storage.foldername(name))[3] = auth.uid()::text
  );

DROP POLICY IF EXISTS "kyc owner read" ON storage.objects;
CREATE POLICY "kyc owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] = 'kyc'
    AND (
      (storage.foldername(name))[3] = auth.uid()::text
      OR public.is_admin_user()
    )
  );

DROP POLICY IF EXISTS "kyc owner delete" ON storage.objects;
CREATE POLICY "kyc owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] = 'kyc'
    AND (storage.foldername(name))[3] = auth.uid()::text
  );
