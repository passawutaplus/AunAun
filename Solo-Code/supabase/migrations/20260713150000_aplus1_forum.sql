-- Aplus1 Community Forum (webboard) — anthem.forum_*
-- Canonical migration: Solo-Code/supabase/migrations/20260713150000_aplus1_forum.sql
-- Apply: cd Solo-Code && cp ../../scripts/ecosystem/aplus1-forum.sql supabase/migrations/20260713150000_aplus1_forum.sql && ./scripts/supabase-push-via-api.sh

CREATE TABLE IF NOT EXISTS anthem.forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_th text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'MessageSquare',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS anthem.forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES anthem.forum_categories(id) ON DELETE RESTRICT,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 3 AND 200),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 20000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'under_review', 'planned', 'in_progress', 'done',
    'wont_fix', 'duplicate', 'answered', 'closed'
  )),
  tags text[] NOT NULL DEFAULT '{}',
  reply_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  accepted_reply_id uuid,
  is_locked boolean NOT NULL DEFAULT false,
  moderation_state text NOT NULL DEFAULT 'published'
    CHECK (moderation_state IN ('published', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS anthem.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES anthem.forum_topics(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 10000),
  parent_id uuid REFERENCES anthem.forum_replies(id) ON DELETE SET NULL,
  is_accepted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'forum_topics_accepted_reply_fk'
  ) THEN
    ALTER TABLE anthem.forum_topics
      ADD CONSTRAINT forum_topics_accepted_reply_fk
      FOREIGN KEY (accepted_reply_id) REFERENCES anthem.forum_replies(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS anthem.forum_topic_likes (
  topic_id uuid NOT NULL REFERENCES anthem.forum_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (topic_id, user_id)
);

CREATE TABLE IF NOT EXISTS anthem.forum_topic_bookmarks (
  topic_id uuid NOT NULL REFERENCES anthem.forum_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (topic_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_topics_activity
  ON anthem.forum_topics (moderation_state, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_category
  ON anthem.forum_topics (category_id, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_author
  ON anthem.forum_topics (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_status
  ON anthem.forum_topics (status, last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_replies_topic
  ON anthem.forum_replies (topic_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_forum_topic_likes_user
  ON anthem.forum_topic_likes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topic_bookmarks_user
  ON anthem.forum_topic_bookmarks (user_id, created_at DESC);

INSERT INTO anthem.forum_categories (slug, name_th, description, icon, sort_order)
VALUES
  ('help', 'ช่วยเหลือ', 'สอบถามการใช้งานและขอความช่วยเหลือ', 'LifeBuoy', 10),
  ('bug', 'แจ้งเหตุ', 'รายงานบั๊กหรือระบบผิดปกติ', 'Bug', 20),
  ('idea', 'เสนอไอเดีย', 'ขอฟีเจอร์ใหม่หรือแนวทางพัฒนา', 'Lightbulb', 30),
  ('feedback', 'ฟีดแบ็ก', 'ติชมสิ่งที่มีอยู่แล้วในระบบ', 'MessageCircleHeart', 40)
ON CONFLICT (slug) DO UPDATE SET
  name_th = EXCLUDED.name_th,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

CREATE OR REPLACE FUNCTION anthem.forum_reply_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE anthem.forum_topics
       SET reply_count = reply_count + 1,
           last_activity_at = now(),
           updated_at = now()
     WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE anthem.forum_topics
       SET reply_count = GREATEST(0, reply_count - 1),
           updated_at = now()
     WHERE id = OLD.topic_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_forum_reply_count_ins ON anthem.forum_replies;
CREATE TRIGGER trg_forum_reply_count_ins
  AFTER INSERT ON anthem.forum_replies
  FOR EACH ROW EXECUTE FUNCTION anthem.forum_reply_count_sync();

DROP TRIGGER IF EXISTS trg_forum_reply_count_del ON anthem.forum_replies;
CREATE TRIGGER trg_forum_reply_count_del
  AFTER DELETE ON anthem.forum_replies
  FOR EACH ROW EXECUTE FUNCTION anthem.forum_reply_count_sync();

CREATE OR REPLACE FUNCTION anthem.forum_topic_like_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE anthem.forum_topics
       SET like_count = like_count + 1 WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE anthem.forum_topics
       SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.topic_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_forum_topic_like_ins ON anthem.forum_topic_likes;
CREATE TRIGGER trg_forum_topic_like_ins
  AFTER INSERT ON anthem.forum_topic_likes
  FOR EACH ROW EXECUTE FUNCTION anthem.forum_topic_like_count_sync();

DROP TRIGGER IF EXISTS trg_forum_topic_like_del ON anthem.forum_topic_likes;
CREATE TRIGGER trg_forum_topic_like_del
  AFTER DELETE ON anthem.forum_topic_likes
  FOR EACH ROW EXECUTE FUNCTION anthem.forum_topic_like_count_sync();

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

  INSERT INTO anthem.forum_topics (category_id, author_id, title, body, tags)
  VALUES (_cat_id, _uid, trim(_title), trim(_body), coalesce(_tags, '{}'))
  RETURNING id INTO _topic_id;

  RETURN _topic_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_forum_topic(text, text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_forum_topic(text, text, text, text[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_forum_reply(
  _topic_id uuid,
  _body text,
  _parent_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _reply_id uuid;
  _locked boolean;
  _mod text;
  _recent int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน';
  END IF;
  IF char_length(trim(coalesce(_body, ''))) < 1 THEN
    RAISE EXCEPTION 'INVALID: กรุณากรอกข้อความ';
  END IF;

  SELECT is_locked, moderation_state INTO _locked, _mod
  FROM anthem.forum_topics WHERE id = _topic_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID: ไม่พบกระทู้';
  END IF;
  IF _mod <> 'published' THEN
    RAISE EXCEPTION 'INVALID: กระทู้นี้ไม่สามารถตอบได้';
  END IF;
  IF _locked THEN
    RAISE EXCEPTION 'INVALID: กระทู้นี้ถูกล็อกแล้ว';
  END IF;

  SELECT count(*) INTO _recent
  FROM anthem.forum_replies
  WHERE author_id = _uid AND created_at > now() - interval '1 hour';
  IF _recent >= 30 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ตอบได้ไม่เกิน 30 ครั้งต่อชั่วโมง';
  END IF;

  IF _parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM anthem.forum_replies WHERE id = _parent_id AND topic_id = _topic_id
  ) THEN
    RAISE EXCEPTION 'INVALID: คำตอบต้นทางไม่ถูกต้อง';
  END IF;

  INSERT INTO anthem.forum_replies (topic_id, author_id, body, parent_id)
  VALUES (_topic_id, _uid, trim(_body), _parent_id)
  RETURNING id INTO _reply_id;

  RETURN _reply_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_forum_reply(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_forum_reply(uuid, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_forum_reply(_reply_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _topic_id uuid;
  _author uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน';
  END IF;

  SELECT r.topic_id, t.author_id INTO _topic_id, _author
  FROM anthem.forum_replies r
  JOIN anthem.forum_topics t ON t.id = r.topic_id
  WHERE r.id = _reply_id;

  IF _topic_id IS NULL THEN
    RAISE EXCEPTION 'INVALID: ไม่พบคำตอบ';
  END IF;
  IF _author <> _uid AND NOT public.has_role(_uid, 'admin') THEN
    RAISE EXCEPTION 'AUTH: ไม่มีสิทธิ์';
  END IF;

  UPDATE anthem.forum_replies SET is_accepted = false WHERE topic_id = _topic_id;
  UPDATE anthem.forum_replies SET is_accepted = true WHERE id = _reply_id;
  UPDATE anthem.forum_topics
     SET accepted_reply_id = _reply_id,
         status = CASE WHEN status = 'open' THEN 'answered' ELSE status END,
         updated_at = now()
   WHERE id = _topic_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_forum_reply(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_forum_reply(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bump_forum_topic_view(_topic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
BEGIN
  UPDATE anthem.forum_topics
     SET view_count = view_count + 1
   WHERE id = _topic_id AND moderation_state = 'published';
END;
$$;

REVOKE ALL ON FUNCTION public.bump_forum_topic_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bump_forum_topic_view(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_forum_topic(
  _topic_id uuid,
  _moderation_state text DEFAULT NULL,
  _status text DEFAULT NULL,
  _is_locked boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;

  UPDATE anthem.forum_topics SET
    moderation_state = coalesce(_moderation_state, moderation_state),
    status = coalesce(_status, status),
    is_locked = coalesce(_is_locked, is_locked),
    updated_at = now()
  WHERE id = _topic_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_forum_topic(uuid, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_forum_topic(uuid, text, text, boolean) TO authenticated;

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

ALTER TABLE anthem.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.forum_topic_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.forum_topic_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_categories_public_read ON anthem.forum_categories;
CREATE POLICY forum_categories_public_read
  ON anthem.forum_categories FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS forum_topics_public_read ON anthem.forum_topics;
CREATE POLICY forum_topics_public_read
  ON anthem.forum_topics FOR SELECT
  USING (
    moderation_state = 'published'
    OR author_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS forum_topics_author_insert ON anthem.forum_topics;
CREATE POLICY forum_topics_author_insert
  ON anthem.forum_topics FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS forum_topics_author_update ON anthem.forum_topics;
CREATE POLICY forum_topics_author_update
  ON anthem.forum_topics FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS forum_replies_public_read ON anthem.forum_replies;
CREATE POLICY forum_replies_public_read
  ON anthem.forum_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM anthem.forum_topics t
      WHERE t.id = topic_id
        AND (
          t.moderation_state = 'published'
          OR t.author_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

DROP POLICY IF EXISTS forum_replies_author_insert ON anthem.forum_replies;
CREATE POLICY forum_replies_author_insert
  ON anthem.forum_replies FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS forum_replies_author_update ON anthem.forum_replies;
CREATE POLICY forum_replies_author_update
  ON anthem.forum_replies FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS forum_replies_author_delete ON anthem.forum_replies;
CREATE POLICY forum_replies_author_delete
  ON anthem.forum_replies FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS forum_likes_public_read ON anthem.forum_topic_likes;
CREATE POLICY forum_likes_public_read
  ON anthem.forum_topic_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS forum_likes_own_write ON anthem.forum_topic_likes;
CREATE POLICY forum_likes_own_write
  ON anthem.forum_topic_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS forum_likes_own_delete ON anthem.forum_topic_likes;
CREATE POLICY forum_likes_own_delete
  ON anthem.forum_topic_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS forum_bookmarks_own_all ON anthem.forum_topic_bookmarks;
CREATE POLICY forum_bookmarks_own_all
  ON anthem.forum_topic_bookmarks FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT ON anthem.forum_categories TO anon, authenticated;
GRANT SELECT ON anthem.forum_topics TO anon, authenticated;
GRANT SELECT ON anthem.forum_replies TO anon, authenticated;
GRANT SELECT ON anthem.forum_topic_likes TO anon, authenticated;
GRANT INSERT, UPDATE ON anthem.forum_topics TO authenticated;
GRANT INSERT, UPDATE, DELETE ON anthem.forum_replies TO authenticated;
GRANT INSERT, DELETE ON anthem.forum_topic_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON anthem.forum_topic_bookmarks TO authenticated;
GRANT ALL ON anthem.forum_categories TO service_role;
GRANT ALL ON anthem.forum_topics TO service_role;
GRANT ALL ON anthem.forum_replies TO service_role;
GRANT ALL ON anthem.forum_topic_likes TO service_role;
GRANT ALL ON anthem.forum_topic_bookmarks TO service_role;
