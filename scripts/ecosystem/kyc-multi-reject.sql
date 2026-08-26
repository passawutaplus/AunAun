-- Multi-select KYC reject reasons. Keep reject_reason_code/label for email + old rows.
-- Apply via: node scripts/ecosystem/apply-kyc-migration.mjs kyc-multi-reject.sql

ALTER TABLE shared.kyc_requests
  ADD COLUMN IF NOT EXISTS reject_reason_codes text[];

DROP FUNCTION IF EXISTS public.admin_reject_kyc(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.admin_reject_kyc(uuid, text);

CREATE OR REPLACE FUNCTION public.admin_reject_kyc(
  _request_id uuid,
  _note text DEFAULT '',
  _reason_codes text[] DEFAULT ARRAY['other']::text[],
  _reason_labels text[] DEFAULT ARRAY[]::text[]
)
RETURNS shared.kyc_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  req shared.kyc_requests;
  codes text[];
  labels text[];
  label text;
  body text;
  allowed text[] := ARRAY[
    'blurry_id', 'blurry_selfie', 'blurry_bank_book',
    'name_mismatch', 'id_number_mismatch', 'bank_name_mismatch',
    'invalid_bank_account', 'duplicate_bank', 'incomplete_docs',
    'suspected_fraud', 'other'
  ];
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  SELECT coalesce(array_agg(x ORDER BY ordinality), ARRAY[]::text[])
    INTO codes
  FROM unnest(coalesce(_reason_codes, ARRAY[]::text[])) WITH ORDINALITY AS t(x, ordinality)
  WHERE x = ANY (allowed);

  IF coalesce(cardinality(codes), 0) = 0 THEN
    RAISE EXCEPTION 'เลือกเหตุผลปฏิเสธอย่างน้อย 1 ข้อ';
  END IF;

  IF 'other' = ANY (codes) AND trim(coalesce(_note, '')) = '' THEN
    RAISE EXCEPTION 'กรุณาระบุเหตุผลเมื่อเลือก อื่นๆ';
  END IF;

  labels := coalesce(_reason_labels, ARRAY[]::text[]);
  IF cardinality(labels) <> cardinality(codes) THEN
    labels := codes;
  END IF;

  label := nullif(array_to_string(
    ARRAY(SELECT nullif(trim(x), '') FROM unnest(labels) AS x),
    ' · '
  ), '');
  IF label IS NULL THEN
    label := 'ไม่ผ่านการตรวจสอบ';
  END IF;

  UPDATE shared.kyc_requests
     SET status = 'rejected',
         admin_note = coalesce(_note, ''),
         reject_reason_code = codes[1],
         reject_reason_codes = codes,
         reject_reason_label = label,
         reviewed_at = now(),
         reviewed_by = auth.uid(),
         submission_meta = coalesce(submission_meta, '{}'::jsonb)
           || jsonb_build_object('reject_reason_codes', to_jsonb(codes))
   WHERE id = _request_id AND status = 'pending'
   RETURNING * INTO req;

  IF req.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบคำขอหรือสถานะไม่ถูกต้อง';
  END IF;

  body := label;
  IF trim(coalesce(_note, '')) <> '' THEN
    body := body || ' — ' || trim(_note);
  END IF;
  body := body || ' ข้อมูลที่ยังใช้ได้ถูกเก็บไว้ — แก้เฉพาะจุดที่มีปัญหาแล้วยื่นใหม่';

  PERFORM public.log_admin_audit(
    'kyc.reject', 'kyc_request', _request_id::text,
    jsonb_build_object('subject_user_id', req.user_id, 'reason_codes', to_jsonb(codes))
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

REVOKE ALL ON FUNCTION public.admin_reject_kyc(uuid, text, text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_kyc(uuid, text, text[], text[]) TO authenticated;
