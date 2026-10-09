-- Verbatim copy of production public.create_report (read from pg_get_functiondef, 2026-10-09).
CREATE OR REPLACE FUNCTION public.create_report(_target_type text, _target_id uuid, _target_owner_id uuid, _reason text, _details text DEFAULT ''::text, _evidence_urls text[] DEFAULT '{}'::text[], _evidence_files jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'anthem', 'shared'
AS $function$
DECLARE
  _reporter_id uuid := auth.uid();
  _report_id uuid;
  _allowed_types text[] := ARRAY[
    'user', 'project', 'comment', 'studio', 'message', 'job',
    'community_post', 'community_comment',
    'forum_topic', 'forum_reply',
    'work_review'
  ];
  _allowed_reasons text[] := ARRAY[
    'spam', 'harassment', 'nsfw', 'copyright', 'scam', 'impersonation', 'other', 'job_spam'
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

  BEGIN
    SELECT * INTO _ai FROM public.report_ai_triage(_reason, _target_type, _details, _ev_count);
    UPDATE anthem.user_reports
       SET ai_priority = _ai.priority_score,
           ai_summary = _ai.summary,
           ai_recommendation = _ai.recommendation,
           ai_reviewed_at = now()
     WHERE id = _report_id;
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.platform_events (event_type, actor_id, target_type, target_id, metadata)
    VALUES (
      'report.created', _reporter_id, _target_type, _target_id::text,
      jsonb_build_object('reason', _reason, 'report_id', _report_id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN _report_id;
END;
$function$;
grant execute on function public.create_report(text, uuid, uuid, text, text, text[], jsonb) to authenticated;
