-- Community feed: tables, media, Q&A topics, report target types
-- Schema: anthem (Pixel100 / an1hem)

CREATE TABLE IF NOT EXISTS anthem.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_kind text NOT NULL CHECK (post_kind IN ('tip', 'question')),
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'Graphic',
  tags text[] NOT NULL DEFAULT '{}',
  gallery_urls text[] NOT NULL DEFAULT '{}',
  video_urls text[] NOT NULL DEFAULT '{}',
  question_topic text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'draft')),
  reply_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anthem.community_posts
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS question_topic text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'community_posts_question_topic_chk'
  ) THEN
    ALTER TABLE anthem.community_posts
      ADD CONSTRAINT community_posts_question_topic_chk
      CHECK (
        question_topic IS NULL
        OR question_topic IN (
          'feedback', 'technique', 'tools', 'career', 'client', 'inspiration', 'other'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_posts_created
  ON anthem.community_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_kind
  ON anthem.community_posts (post_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_status
  ON anthem.community_posts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS anthem.community_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES anthem.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES anthem.community_post_comments(id) ON DELETE CASCADE,
  depth integer NOT NULL DEFAULT 0 CHECK (depth >= 0 AND depth <= 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_post_comments_post
  ON anthem.community_post_comments (post_id, created_at ASC);

CREATE OR REPLACE FUNCTION anthem.community_post_reply_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE anthem.community_posts
       SET reply_count = reply_count + 1,
           updated_at = now()
     WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE anthem.community_posts
       SET reply_count = GREATEST(0, reply_count - 1),
           updated_at = now()
     WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_reply_count_ins ON anthem.community_post_comments;
CREATE TRIGGER trg_community_post_reply_count_ins
  AFTER INSERT ON anthem.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION anthem.community_post_reply_count_sync();

DROP TRIGGER IF EXISTS trg_community_post_reply_count_del ON anthem.community_post_comments;
CREATE TRIGGER trg_community_post_reply_count_del
  AFTER DELETE ON anthem.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION anthem.community_post_reply_count_sync();

ALTER TABLE anthem.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.community_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_posts_public_read" ON anthem.community_posts;
CREATE POLICY "community_posts_public_read"
  ON anthem.community_posts FOR SELECT
  USING (status = 'published' OR author_id = auth.uid());

DROP POLICY IF EXISTS "community_posts_author_write" ON anthem.community_posts;
CREATE POLICY "community_posts_author_write"
  ON anthem.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "community_posts_author_update" ON anthem.community_posts;
CREATE POLICY "community_posts_author_update"
  ON anthem.community_posts FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "community_comments_public_read" ON anthem.community_post_comments;
CREATE POLICY "community_comments_public_read"
  ON anthem.community_post_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "community_comments_author_write" ON anthem.community_post_comments;
CREATE POLICY "community_comments_author_write"
  ON anthem.community_post_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

GRANT SELECT ON anthem.community_posts TO anon, authenticated;
GRANT INSERT, UPDATE ON anthem.community_posts TO authenticated;
GRANT SELECT, INSERT ON anthem.community_post_comments TO authenticated;
GRANT ALL ON anthem.community_posts TO service_role;
GRANT ALL ON anthem.community_post_comments TO service_role;

-- Extend report target types (create_report RPC)
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

  INSERT INTO anthem.user_reports (
    reporter_id, target_type, target_id, target_owner_id,
    reason, details, evidence_urls, evidence_files, status
  ) VALUES (
    _reporter_id, _target_type, _target_id, _target_owner_id,
    _reason, coalesce(_details, ''), coalesce(_evidence_urls, '{}'),
    coalesce(_evidence_files, '[]'::jsonb), 'open'
  )
  RETURNING id INTO _report_id;

  INSERT INTO public.platform_events (event_type, actor_id, target_type, target_id, metadata)
  VALUES (
    'report.created', _reporter_id, _target_type, _target_id::text,
    jsonb_build_object('reason', _reason, 'report_id', _report_id)
  );

  RETURN _report_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_report(text, uuid, uuid, text, text, text[], jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_report(text, uuid, uuid, text, text, text[], jsonb) TO authenticated;
