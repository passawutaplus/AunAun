-- Full KYC verification: documents, payout profile, AI pre-review, eligibility helpers
-- Schema: shared (kyc_requests) + storage paths under project-media/anthem/kyc/

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

-- Base table (may not exist on older projects)
CREATE TABLE IF NOT EXISTS shared.kyc_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  contact_note text NOT NULL DEFAULT '',
  admin_note text NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  legal_name text,
  id_type text DEFAULT 'national_id',
  bank_name text,
  account_number text,
  account_name text,
  bank_book_path text,
  ai_risk_score integer,
  ai_summary text,
  ai_recommendation text,
  ai_reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_kyc_requests_user ON shared.kyc_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON shared.kyc_requests (status);

ALTER TABLE shared.kyc_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kyc_requests_owner_select ON shared.kyc_requests;
CREATE POLICY kyc_requests_owner_select ON shared.kyc_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS kyc_requests_admin_select ON shared.kyc_requests;
CREATE POLICY kyc_requests_admin_select ON shared.kyc_requests
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

-- Extend kyc_requests (idempotent on re-run)
ALTER TABLE shared.kyc_requests
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS id_type text DEFAULT 'national_id',
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS bank_book_path text,
  ADD COLUMN IF NOT EXISTS ai_risk_score integer,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_recommendation text,
  ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamptz;

CREATE TABLE IF NOT EXISTS shared.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES shared.kyc_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('id_front', 'id_back', 'selfie', 'bank_book')),
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, doc_type)
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user ON shared.kyc_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_request ON shared.kyc_documents (request_id);

CREATE TABLE IF NOT EXISTS shared.payout_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  bank_book_path text,
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shared.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.payout_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kyc_documents_owner ON shared.kyc_documents;
CREATE POLICY kyc_documents_owner ON shared.kyc_documents
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS payout_profiles_owner ON shared.payout_profiles;
CREATE POLICY payout_profiles_owner ON shared.payout_profiles
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin read via service role / admin RPCs

CREATE OR REPLACE FUNCTION public.normalize_th_name(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g')));
$$;

CREATE OR REPLACE FUNCTION public.kyc_ai_score(
  _legal_name text,
  _account_name text,
  _has_id_front boolean,
  _has_id_back boolean,
  _has_selfie boolean,
  _duplicate_bank boolean
)
RETURNS TABLE(risk_score integer, summary text, recommendation text)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score integer := 0;
  ln text := public.normalize_th_name(_legal_name);
  an text := public.normalize_th_name(_account_name);
  name_match boolean;
BEGIN
  IF NOT _has_id_front THEN score := score + 25; END IF;
  IF NOT _has_id_back THEN score := score + 20; END IF;
  IF NOT _has_selfie THEN score := score + 25; END IF;
  name_match := ln <> '' AND an <> '' AND (ln = an OR ln LIKE '%' || an || '%' OR an LIKE '%' || ln || '%');
  IF NOT name_match THEN score := score + 20; END IF;
  IF _duplicate_bank THEN score := score + 40; END IF;

  risk_score := LEAST(100, score);
  summary := CASE
    WHEN risk_score <= 15 THEN 'เอกสารครบ ชื่อบัญชีสอดคล้อง ความเสี่ยงต่ำ'
    WHEN risk_score <= 40 THEN 'ควรตรวจสอบชื่อบัญชีหรือความชัดของรูปเอกสาร'
    ELSE 'พบสัญญาณความเสี่ยง — ตรวจสอบด้วยตนเองก่อนอนุมัติ'
  END;
  recommendation := CASE
    WHEN risk_score <= 15 THEN 'approve'
    WHEN risk_score <= 50 THEN 'review'
    ELSE 'reject_or_review'
  END;
  RETURN NEXT;
END;
$$;

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
    bank_name, account_number, account_name, submitted_at
  ) VALUES (
    uid, 'pending', coalesce(_contact_note, ''), trim(_legal_name), coalesce(_id_type, 'national_id'),
    trim(_bank_name), trim(_account_number), trim(_account_name), now()
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

REVOKE ALL ON FUNCTION public.submit_kyc_verification(text, text, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_kyc_verification(text, text, text, text, text, jsonb, text) TO authenticated;

-- Extend approve to sync payout profile + is_verified on profiles
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

  RETURN req;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_kyc(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_kyc(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_kyc_documents(_request_id uuid)
RETURNS TABLE(doc_type text, storage_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;
  RETURN QUERY
    SELECT d.doc_type, d.storage_path
    FROM shared.kyc_documents d
    WHERE d.request_id = _request_id
    ORDER BY d.doc_type;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_kyc_documents(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_kyc_documents(uuid) TO authenticated;

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

  RETURN req;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_kyc(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_kyc(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_kyc_request(_contact_note text DEFAULT '')
RETURNS shared.kyc_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  req shared.kyc_requests;
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

  INSERT INTO shared.kyc_requests (user_id, status, contact_note, submitted_at)
  VALUES (uid, 'pending', coalesce(_contact_note, ''), now())
  RETURNING * INTO req;

  RETURN req;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_kyc_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_kyc_request(text) TO authenticated;
