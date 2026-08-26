-- KYC AI score: start at 100, deduct for missing docs / name mismatch / duplicate bank.
-- ai_risk_score column keeps its name; stored value is now quality (higher = better).
-- Apply via: node scripts/ecosystem/apply-kyc-migration.mjs kyc-ai-quality-score.sql

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
SET search_path TO 'public'
AS $$
DECLARE
  score integer := 100;
  ln text := public.normalize_th_name(_legal_name);
  an text := public.normalize_th_name(_account_name);
  name_match boolean;
BEGIN
  IF NOT _has_id_front THEN score := score - 25; END IF;
  IF NOT _has_selfie THEN score := score - 25; END IF;
  name_match := ln <> '' AND an <> '' AND (ln = an OR ln LIKE '%' || an || '%' OR an LIKE '%' || ln || '%');
  IF NOT name_match THEN score := score - 20; END IF;
  IF _duplicate_bank THEN score := score - 40; END IF;

  risk_score := GREATEST(0, score);
  summary := CASE
    WHEN risk_score >= 85 THEN 'เอกสารครบ ชื่อบัญชีสอดคล้อง คะแนนสูง'
    WHEN risk_score >= 60 THEN 'ควรตรวจสอบชื่อบัญชีหรือความชัดของรูปเอกสาร'
    ELSE 'พบสัญญาณความเสี่ยง — ตรวจสอบด้วยตนเองก่อนอนุมัติ'
  END;
  recommendation := CASE
    WHEN risk_score >= 85 THEN 'approve'
    WHEN risk_score >= 50 THEN 'review'
    ELSE 'reject_or_review'
  END;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.kyc_ai_score(text, text, boolean, boolean, boolean, boolean)
  TO authenticated, service_role;

-- Invert existing risk scores (0 good → 100 good).
UPDATE shared.kyc_requests
SET
  ai_summary = CASE
    WHEN (100 - ai_risk_score) >= 85 THEN 'เอกสารครบ ชื่อบัญชีสอดคล้อง คะแนนสูง'
    WHEN (100 - ai_risk_score) >= 60 THEN 'ควรตรวจสอบชื่อบัญชีหรือความชัดของรูปเอกสาร'
    ELSE 'พบสัญญาณความเสี่ยง — ตรวจสอบด้วยตนเองก่อนอนุมัติ'
  END,
  ai_recommendation = CASE
    WHEN (100 - ai_risk_score) >= 85 THEN 'approve'
    WHEN (100 - ai_risk_score) >= 50 THEN 'review'
    ELSE 'reject_or_review'
  END,
  ai_risk_score = 100 - ai_risk_score
WHERE ai_risk_score IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_triage_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  RETURN jsonb_build_object(
    'high_risk_kyc', (
      SELECT count(*)::int FROM shared.kyc_requests
      WHERE status = 'pending' AND ai_risk_score IS NOT NULL AND ai_risk_score < 60
    ),
    'urgent_reports', (
      SELECT count(*)::int FROM anthem.user_reports
      WHERE status IN ('open', 'reviewing')
        AND (
          coalesce(ai_priority, 0) >= 70
          OR ai_recommendation = 'urgent'
        )
    ),
    'pending_kyc', (
      SELECT count(*)::int FROM shared.kyc_requests WHERE status = 'pending'
    ),
    'open_reports', (
      SELECT count(*)::int FROM anthem.user_reports
      WHERE status IN ('open', 'reviewing')
    ),
    'kyc_preview', coalesce((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT id, user_id, legal_name, ai_risk_score, ai_summary, ai_recommendation, submitted_at
        FROM shared.kyc_requests
        WHERE status = 'pending' AND ai_risk_score IS NOT NULL AND ai_risk_score < 60
        ORDER BY ai_risk_score ASC NULLS LAST, submitted_at ASC
        LIMIT 5
      ) t
    ), '[]'::jsonb),
    'report_preview', coalesce((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT id, reason, target_type, ai_priority, ai_summary, ai_recommendation, created_at
        FROM anthem.user_reports
        WHERE status IN ('open', 'reviewing')
        ORDER BY coalesce(ai_priority, 0) DESC, created_at ASC
        LIMIT 5
      ) t
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_triage_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_triage_snapshot() TO authenticated;
