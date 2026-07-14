-- Aplus1 forum: team announcements + block non-admin posts in announcements
-- Also allow report reason job_spam for forum job-hunting posts.

ALTER TABLE anthem.forum_topics
  ADD COLUMN IF NOT EXISTS is_announcement boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_forum_topics_announcement
  ON anthem.forum_topics (is_announcement DESC, pinned_at DESC NULLS LAST, last_activity_at DESC)
  WHERE is_announcement = true AND moderation_state = 'published';

INSERT INTO anthem.forum_categories (slug, name_th, description, icon, sort_order)
VALUES (
  'announcements',
  'ประกาศจากทีม',
  'ข่าวอัปเดต โรดแมป และการบำรุงรักษาจากทีม Aplus1',
  'Megaphone',
  1
)
ON CONFLICT (slug) DO UPDATE SET
  name_th = EXCLUDED.name_th,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Backfill: mark existing pinned topics in announcements category (if any)
UPDATE anthem.forum_topics t
SET is_announcement = true
FROM anthem.forum_categories c
WHERE t.category_id = c.id
  AND c.slug = 'announcements'
  AND t.is_announcement = false;

CREATE OR REPLACE FUNCTION public.create_forum_topic(
  _category_slug text,
  _title text,
  _body text,
  _tags text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cat_id uuid;
  _topic_id uuid;
  _recent int;
  _is_announce boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน';
  END IF;

  IF char_length(trim(coalesce(_title, ''))) < 3 THEN
    RAISE EXCEPTION 'INVALID: หัวข้อสั้นเกินไป';
  END IF;
  IF char_length(trim(coalesce(_body, ''))) < 1 THEN
    RAISE EXCEPTION 'INVALID: กรุณากรอกรายละเอียด';
  END IF;

  IF lower(trim(coalesce(_category_slug, ''))) = 'announcements' THEN
    IF NOT public.has_role(_uid, 'admin') THEN
      RAISE EXCEPTION 'FORBIDDEN: หมวดประกาศจากทีมโพสต์ได้เฉพาะแอดมิน';
    END IF;
    _is_announce := true;
  END IF;

  SELECT count(*) INTO _recent
  FROM anthem.forum_topics
  WHERE author_id = _uid AND created_at > now() - interval '1 hour';
  IF _recent >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMIT: สร้างกระทู้ได้ไม่เกิน 10 ครั้งต่อชั่วโมง';
  END IF;

  SELECT id INTO _cat_id
  FROM anthem.forum_categories
  WHERE slug = _category_slug AND is_active = true;
  IF _cat_id IS NULL THEN
    RAISE EXCEPTION 'INVALID: หมวดหมู่ไม่ถูกต้อง';
  END IF;

  INSERT INTO anthem.forum_topics (
    category_id, author_id, title, body, tags,
    is_announcement, is_pinned, pinned_at
  )
  VALUES (
    _cat_id, _uid, trim(_title), trim(_body), coalesce(_tags, '{}'),
    _is_announce,
    CASE WHEN _is_announce THEN true ELSE false END,
    CASE WHEN _is_announce THEN now() ELSE NULL END
  )
  RETURNING id INTO _topic_id;

  RETURN _topic_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_forum_topic(text, text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_forum_topic(text, text, text, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_forum_announcement(
  _title text,
  _body text,
  _tags text[] DEFAULT '{}',
  _lock_comments boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cat_id uuid;
  _topic_id uuid;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;

  IF char_length(trim(coalesce(_title, ''))) < 3 THEN
    RAISE EXCEPTION 'INVALID: หัวข้อสั้นเกินไป';
  END IF;
  IF char_length(trim(coalesce(_body, ''))) < 1 THEN
    RAISE EXCEPTION 'INVALID: กรุณากรอกรายละเอียด';
  END IF;

  SELECT id INTO _cat_id
  FROM anthem.forum_categories
  WHERE slug = 'announcements' AND is_active = true;
  IF _cat_id IS NULL THEN
    RAISE EXCEPTION 'INVALID: ไม่พบหมวดประกาศจากทีม';
  END IF;

  INSERT INTO anthem.forum_topics (
    category_id, author_id, title, body, tags,
    is_announcement, is_pinned, pinned_at, is_locked, status
  )
  VALUES (
    _cat_id, _uid, trim(_title), trim(_body), coalesce(_tags, '{}'),
    true, true, now(), coalesce(_lock_comments, false), 'open'
  )
  RETURNING id INTO _topic_id;

  RETURN _topic_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_forum_announcement(text, text, text[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_forum_announcement(text, text, text[], boolean) TO authenticated;

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
    'forum_topic', 'forum_reply'
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
