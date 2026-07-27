-- Work review replies + report target type work_review
-- Canonical: Solo-Code/supabase/migrations/20260724170000_work_review_replies_report.sql

ALTER TABLE anthem.work_reviews
  ADD COLUMN IF NOT EXISTS reply_body text;

ALTER TABLE anthem.work_reviews
  ADD COLUMN IF NOT EXISTS reply_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'work_reviews_reply_body_len'
      AND conrelid = 'anthem.work_reviews'::regclass
  ) THEN
    ALTER TABLE anthem.work_reviews
      ADD CONSTRAINT work_reviews_reply_body_len
      CHECK (reply_body IS NULL OR char_length(trim(reply_body)) BETWEEN 1 AND 500);
  END IF;
END $$;

COMMENT ON COLUMN anthem.work_reviews.reply_body IS
  'Optional public reply from the reviewed user (subject)';

-- Subject may set/update reply (column guard below)
DROP POLICY IF EXISTS "work_reviews_reply_subject" ON anthem.work_reviews;
CREATE POLICY "work_reviews_reply_subject"
  ON anthem.work_reviews FOR UPDATE TO authenticated
  USING (subject_user_id = auth.uid() AND visibility = 'public')
  WITH CHECK (subject_user_id = auth.uid());

CREATE OR REPLACE FUNCTION anthem.work_reviews_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.subject_user_id IS DISTINCT FROM OLD.subject_user_id
     OR NEW.author_user_id IS DISTINCT FROM OLD.author_user_id
     OR NEW.hire_request_id IS DISTINCT FROM OLD.hire_request_id
     OR NEW.collab_request_id IS DISTINCT FROM OLD.collab_request_id
  THEN
    RAISE EXCEPTION 'INVALID: cannot change review identity';
  END IF;

  -- Subject: reply only
  IF auth.uid() = OLD.subject_user_id AND auth.uid() IS DISTINCT FROM OLD.author_user_id THEN
    IF NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.tags IS DISTINCT FROM OLD.tags
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.visibility IS DISTINCT FROM OLD.visibility
    THEN
      RAISE EXCEPTION 'INVALID: subject can only reply';
    END IF;
    IF NEW.reply_body IS DISTINCT FROM OLD.reply_body THEN
      NEW.reply_at := CASE WHEN NEW.reply_body IS NULL THEN NULL ELSE now() END;
    ELSE
      NEW.reply_at := OLD.reply_at;
    END IF;
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;

  -- Author edit window: cannot touch reply
  IF auth.uid() = OLD.author_user_id THEN
    NEW.reply_body := OLD.reply_body;
    NEW.reply_at := OLD.reply_at;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'FORBIDDEN: cannot update this review';
END;
$$;

DROP TRIGGER IF EXISTS work_reviews_guard_update ON anthem.work_reviews;
CREATE TRIGGER work_reviews_guard_update
  BEFORE UPDATE ON anthem.work_reviews
  FOR EACH ROW
  EXECUTE FUNCTION anthem.work_reviews_guard_update();

-- Allow reporting work reviews via create_report
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
$$;

REVOKE ALL ON FUNCTION public.create_report(text, uuid, uuid, text, text, text[], jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_report(text, uuid, uuid, text, text, text[], jsonb) TO authenticated;
