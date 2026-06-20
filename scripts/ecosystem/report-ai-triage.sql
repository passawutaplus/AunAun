-- Report AI triage: rule-based summary on insert (no auto-resolve)
-- Schema: anthem.user_reports + public.create_report

ALTER TABLE anthem.user_reports
  ADD COLUMN IF NOT EXISTS ai_priority integer,
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_recommendation text,
  ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamptz;

CREATE OR REPLACE FUNCTION public.report_ai_triage(
  _reason text,
  _target_type text,
  _details text,
  _evidence_count integer DEFAULT 0
)
RETURNS TABLE(priority_score integer, summary text, recommendation text)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  score integer := 0;
  det_len integer := length(trim(coalesce(_details, '')));
BEGIN
  score := CASE coalesce(_reason, 'other')
    WHEN 'scam' THEN 45
    WHEN 'harassment' THEN 40
    WHEN 'impersonation' THEN 35
    WHEN 'nsfw' THEN 30
    WHEN 'copyright' THEN 25
    WHEN 'spam' THEN 15
    ELSE 10
  END;

  IF _evidence_count > 0 THEN
    score := score + LEAST(15, _evidence_count * 5);
  END IF;
  IF det_len > 100 THEN score := score + 5; END IF;
  IF det_len > 300 THEN score := score + 5; END IF;

  IF _target_type IN ('message', 'comment', 'community_comment') AND _reason = 'harassment' THEN
    score := score + 10;
  END IF;

  priority_score := LEAST(100, score);

  summary := CASE
    WHEN _reason = 'scam' AND priority_score >= 70 THEN
      'รายงานหลอกลวง — ควรตรวจสอบด่วน' ||
      CASE WHEN _evidence_count > 0 THEN ' (มีหลักฐานแนบ ' || _evidence_count || ' ไฟล์)' ELSE '' END
    WHEN _reason = 'harassment' THEN
      'รายงานคุกคาม/คุกคาม — ตรวจเนื้อหาและพิจารณา strike/ban'
    WHEN _reason = 'copyright' THEN
      'รายงานลิขสิทธิ์ — ตรวจ license ของผลงานและหลักฐาน'
    WHEN _reason = 'impersonation' THEN
      'รายงานแอบอ้างตัวตน — เปรียบเทียบโปรไฟล์และเนื้อหา'
    WHEN _reason = 'nsfw' THEN
      'เนื้อหาไม่เหมาะสม — ตรวจภาพ/ข้อความตามนโยบายชุมชน'
    WHEN _reason = 'spam' THEN
      'รายงานสแปม — โทษเบา (strike) อาจเหมาะ แต่ต้องกดเอง'
    ELSE
      'รายงานทั่วไป — อ่านรายละเอียดแล้วตัดสินใจ'
  END;

  recommendation := CASE
    WHEN priority_score >= 70 THEN 'urgent'
    WHEN priority_score >= 45 THEN 'review'
    ELSE 'routine'
  END;

  RETURN NEXT;
END;
$$;

-- Backfill open reports missing AI fields
DO $$
DECLARE
  r record;
  ai record;
  ev_count integer;
BEGIN
  FOR r IN
    SELECT id, reason, target_type, details, evidence_files
    FROM anthem.user_reports
    WHERE status IN ('open', 'reviewing')
      AND ai_reviewed_at IS NULL
  LOOP
    ev_count := COALESCE(jsonb_array_length(r.evidence_files), 0);
    SELECT * INTO ai FROM public.report_ai_triage(r.reason, r.target_type, r.details, ev_count);
    UPDATE anthem.user_reports
       SET ai_priority = ai.priority_score,
           ai_summary = ai.summary,
           ai_recommendation = ai.recommendation,
           ai_reviewed_at = now()
     WHERE id = r.id;
  END LOOP;
END $$;

-- Snapshot for Ops Hub Overview (admin only)
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
      WHERE status = 'pending' AND coalesce(ai_risk_score, 0) > 40
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
        WHERE status = 'pending' AND coalesce(ai_risk_score, 0) > 40
        ORDER BY ai_risk_score DESC NULLS LAST, submitted_at ASC
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

-- Patch create_report to run triage after insert
CREATE OR REPLACE FUNCTION public.create_report(
  _target_type text,
  _target_id uuid,
  _target_owner_id uuid,
  _reason text,
  _details text DEFAULT '',
  _evidence_urls text[] DEFAULT '{}',
  _evidence_files jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem, shared
AS $$
DECLARE
  _reporter_id uuid := auth.uid();
  _report_id uuid;
  _allowed_types text[] := ARRAY[
    'user', 'project', 'comment', 'studio', 'message', 'job',
    'community_post', 'community_comment'
  ];
  _allowed_reasons text[] := ARRAY[
    'spam', 'harassment', 'nsfw', 'copyright', 'scam', 'impersonation', 'other'
  ];
  _recent int;
  _ev_count int;
  _ai record;
BEGIN
  IF _reporter_id IS NULL THEN
    RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน';
  END IF;

  IF NOT (_target_type = ANY(_allowed_types)) THEN
    RAISE EXCEPTION 'INVALID: target_type ไม่ถูกต้อง';
  END IF;

  IF NOT (_reason = ANY(_allowed_reasons)) THEN
    RAISE EXCEPTION 'INVALID: reason ไม่ถูกต้อง';
  END IF;

  IF _target_owner_id IS NOT NULL AND _target_owner_id = _reporter_id THEN
    RAISE EXCEPTION 'INVALID: ไม่สามารถรายงานเนื้อหาของตัวเอง';
  END IF;

  SELECT count(*) INTO _recent
  FROM anthem.user_reports
  WHERE reporter_id = _reporter_id
    AND created_at > now() - interval '1 hour';

  IF _recent >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMIT: รายงานได้ไม่เกิน 10 ครั้งต่อชั่วโมง';
  END IF;

  IF EXISTS (
    SELECT 1 FROM anthem.user_reports
    WHERE reporter_id = _reporter_id
      AND target_type = _target_type
      AND target_id = _target_id
      AND status IN ('open', 'reviewing')
  ) THEN
    RAISE EXCEPTION 'DUPLICATE: คุณรายงานเนื้อหานี้ไปแล้ว';
  END IF;

  _ev_count := coalesce(jsonb_array_length(_evidence_files), 0);

  INSERT INTO anthem.user_reports (
    reporter_id, target_type, target_id, target_owner_id,
    reason, details, evidence_urls, evidence_files, status
  ) VALUES (
    _reporter_id, _target_type, _target_id, _target_owner_id,
    _reason, coalesce(_details, ''), coalesce(_evidence_urls, '{}'),
    coalesce(_evidence_files, '[]'::jsonb), 'open'
  )
  RETURNING id INTO _report_id;

  SELECT * INTO _ai FROM public.report_ai_triage(_reason, _target_type, _details, _ev_count);

  UPDATE anthem.user_reports
     SET ai_priority = _ai.priority_score,
         ai_summary = _ai.summary,
         ai_recommendation = _ai.recommendation,
         ai_reviewed_at = now()
   WHERE id = _report_id;

  INSERT INTO public.platform_events (event_type, actor_id, target_type, target_id, metadata)
  VALUES (
    'report.created', _reporter_id, _target_type, _target_id::text,
    jsonb_build_object(
      'reason', _reason,
      'report_id', _report_id,
      'ai_priority', _ai.priority_score,
      'ai_recommendation', _ai.recommendation
    )
  );

  RETURN _report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_report(text, uuid, uuid, text, text, text[], jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_report(text, uuid, uuid, text, text, text[], jsonb) TO authenticated;
