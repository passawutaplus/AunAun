-- Area Post enhancements: comment likes, images, rate limits, repost, collections, PX scaffold
-- Apply: cd Solo-Code && cp ../../scripts/ecosystem/community-area-post-enhancements.sql supabase/migrations/20260627100000_community_area_post_enhancements.sql && ./scripts/supabase-push-via-api.sh

-- ---------------------------------------------------------------------------
-- Comment likes
-- ---------------------------------------------------------------------------
ALTER TABLE anthem.community_post_comments
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS anthem.community_comment_likes (
  comment_id uuid NOT NULL REFERENCES anthem.community_post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_comment_likes_user
  ON anthem.community_comment_likes (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION anthem.community_comment_like_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE anthem.community_post_comments
       SET like_count = like_count + 1
     WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE anthem.community_post_comments
       SET like_count = GREATEST(0, like_count - 1)
     WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_community_comment_like_ins ON anthem.community_comment_likes;
CREATE TRIGGER trg_community_comment_like_ins
  AFTER INSERT ON anthem.community_comment_likes
  FOR EACH ROW EXECUTE FUNCTION anthem.community_comment_like_count_sync();

DROP TRIGGER IF EXISTS trg_community_comment_like_del ON anthem.community_comment_likes;
CREATE TRIGGER trg_community_comment_like_del
  AFTER DELETE ON anthem.community_comment_likes
  FOR EACH ROW EXECUTE FUNCTION anthem.community_comment_like_count_sync();

ALTER TABLE anthem.community_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_comment_likes_public_read" ON anthem.community_comment_likes;
CREATE POLICY "community_comment_likes_public_read"
  ON anthem.community_comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_comment_likes_own_write" ON anthem.community_comment_likes;
CREATE POLICY "community_comment_likes_own_write"
  ON anthem.community_comment_likes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT ON anthem.community_comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON anthem.community_comment_likes TO authenticated;

CREATE INDEX IF NOT EXISTS idx_community_post_comments_likes
  ON anthem.community_post_comments (post_id, like_count DESC);

-- ---------------------------------------------------------------------------
-- Repost / quote + link URLs
-- ---------------------------------------------------------------------------
ALTER TABLE anthem.community_posts
  ADD COLUMN IF NOT EXISTS quoted_post_id uuid REFERENCES anthem.community_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote_comment text,
  ADD COLUMN IF NOT EXISTS link_urls text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_community_posts_quoted
  ON anthem.community_posts (quoted_post_id)
  WHERE quoted_post_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Publish rate limit (max 5 published posts / hour / author)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION anthem.community_post_publish_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
DECLARE
  _recent int;
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO _recent
  FROM anthem.community_posts
  WHERE author_id = NEW.author_id
    AND status = 'published'
    AND created_at > now() - interval '1 hour'
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF _recent >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT: โพสต์ได้ไม่เกิน 5 ครั้งต่อชั่วโมง';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_publish_rate ON anthem.community_posts;
CREATE TRIGGER trg_community_post_publish_rate
  BEFORE INSERT OR UPDATE OF status ON anthem.community_posts
  FOR EACH ROW EXECUTE FUNCTION anthem.community_post_publish_rate_limit();

-- ---------------------------------------------------------------------------
-- Insert comment RPC (rate limit: 20 / hour)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.insert_community_comment(
  _post_id uuid,
  _content text,
  _parent_id uuid DEFAULT NULL,
  _depth int DEFAULT 0,
  _image_urls text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _recent int;
  _comment_id uuid;
  _images text[];
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบก่อน';
  END IF;

  IF length(trim(coalesce(_content, ''))) < 1 THEN
    RAISE EXCEPTION 'INVALID: พิมพ์ข้อความก่อนส่ง';
  END IF;

  IF length(_content) > 800 THEN
    RAISE EXCEPTION 'INVALID: ไม่เกิน 800 ตัวอักษร';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM anthem.community_posts
    WHERE id = _post_id AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'INVALID: โพสต์ไม่พบหรือยังไม่เผยแพร่';
  END IF;

  SELECT count(*) INTO _recent
  FROM anthem.community_post_comments
  WHERE user_id = _user_id
    AND created_at > now() - interval '1 hour';

  IF _recent >= 20 THEN
    RAISE EXCEPTION 'RATE_LIMIT: คอมเมนต์ได้ไม่เกิน 20 ครั้งต่อชั่วโมง';
  END IF;

  _images := coalesce(_image_urls, '{}');
  IF coalesce(array_length(_images, 1), 0) > 2 THEN
    RAISE EXCEPTION 'INVALID: แนบรูปได้ไม่เกิน 2 รูป';
  END IF;

  INSERT INTO anthem.community_post_comments (
    post_id, user_id, content, parent_id, depth, image_urls
  ) VALUES (
    _post_id,
    _user_id,
    trim(_content),
    _parent_id,
    LEAST(GREATEST(coalesce(_depth, 0), 0), 2),
    _images
  )
  RETURNING id INTO _comment_id;

  RETURN _comment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_community_comment(uuid, text, uuid, int, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_community_comment(uuid, text, uuid, int, text[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- Collection items: community posts
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'collection_items'
  ) THEN
    ALTER TABLE anthem.collection_items
      ADD COLUMN IF NOT EXISTS community_post_id uuid REFERENCES anthem.community_posts(id) ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_collection_items_community_post
      ON anthem.collection_items (community_post_id)
      WHERE community_post_id IS NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- PX engagement ledger (scaffold — amounts configured later)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anthem.community_engagement_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES anthem.community_posts(id) ON DELETE SET NULL,
  kind text NOT NULL,
  px_amount integer NOT NULL DEFAULT 0 CHECK (px_amount >= 0),
  idempotency_key text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_community_engagement_rewards_user
  ON anthem.community_engagement_rewards (user_id, created_at DESC);

ALTER TABLE anthem.community_engagement_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_engagement_rewards_own_read ON anthem.community_engagement_rewards;
CREATE POLICY community_engagement_rewards_own_read
  ON anthem.community_engagement_rewards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON anthem.community_engagement_rewards TO authenticated;
GRANT ALL ON anthem.community_engagement_rewards TO service_role;

CREATE OR REPLACE FUNCTION public.record_community_engagement_milestone(
  _post_id uuid,
  _kind text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  _author_id uuid;
  _key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT author_id INTO _author_id
  FROM anthem.community_posts
  WHERE id = _post_id;

  IF _author_id IS NULL OR _author_id <> auth.uid() THEN
    RETURN;
  END IF;

  _key := _post_id::text || ':' || _kind;

  INSERT INTO anthem.community_engagement_rewards (user_id, post_id, kind, px_amount, idempotency_key, metadata)
  VALUES (_author_id, _post_id, _kind, 0, _key, coalesce(_metadata, '{}'::jsonb))
  ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_community_engagement_milestone(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_community_engagement_milestone(uuid, text, jsonb) TO authenticated;
