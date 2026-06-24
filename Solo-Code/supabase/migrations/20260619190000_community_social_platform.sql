-- Community social platform: likes, saves, views, blocks, notifications helpers

ALTER TABLE anthem.community_posts
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS anthem.community_post_likes (
  post_id uuid NOT NULL REFERENCES anthem.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_likes_user
  ON anthem.community_post_likes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS anthem.community_post_bookmarks (
  post_id uuid NOT NULL REFERENCES anthem.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_post_bookmarks_user
  ON anthem.community_post_bookmarks (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS anthem.community_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES anthem.community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_post_views_post
  ON anthem.community_post_views (post_id, created_at DESC);

CREATE TABLE IF NOT EXISTS anthem.user_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE OR REPLACE FUNCTION anthem.community_post_like_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE anthem.community_posts SET like_count = like_count + 1, updated_at = now() WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE anthem.community_posts SET like_count = GREATEST(0, like_count - 1), updated_at = now() WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_community_post_like_ins ON anthem.community_post_likes;
CREATE TRIGGER trg_community_post_like_ins
  AFTER INSERT ON anthem.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION anthem.community_post_like_count_sync();

DROP TRIGGER IF EXISTS trg_community_post_like_del ON anthem.community_post_likes;
CREATE TRIGGER trg_community_post_like_del
  AFTER DELETE ON anthem.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION anthem.community_post_like_count_sync();

CREATE OR REPLACE FUNCTION public.increment_community_post_view(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  UPDATE anthem.community_posts
     SET view_count = view_count + 1,
         updated_at = now()
   WHERE id = _post_id
     AND status = 'published';

  INSERT INTO anthem.community_post_views (post_id, user_id)
  VALUES (_post_id, auth.uid());
END;
$$;

REVOKE ALL ON FUNCTION public.increment_community_post_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_community_post_view(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_community_event(
  _recipient_id uuid,
  _kind text,
  _title text,
  _body text,
  _link text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared, anthem
AS $$
BEGIN
  IF _recipient_id IS NULL OR _recipient_id = auth.uid() THEN
    RETURN;
  END IF;
  INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata, is_read, is_dismissed)
  VALUES (_recipient_id, 'anthem', _kind, _title, _body, _link, _metadata, false, false);
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_community_event(uuid, text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_community_event(uuid, text, text, text, text, jsonb) TO authenticated;

ALTER TABLE anthem.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.community_post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.community_post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_likes_public_read" ON anthem.community_post_likes;
CREATE POLICY "community_likes_public_read"
  ON anthem.community_post_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_likes_own_write" ON anthem.community_post_likes;
CREATE POLICY "community_likes_own_write"
  ON anthem.community_post_likes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "community_bookmarks_own" ON anthem.community_post_bookmarks;
CREATE POLICY "community_bookmarks_own"
  ON anthem.community_post_bookmarks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "community_views_insert" ON anthem.community_post_views;
CREATE POLICY "community_views_insert"
  ON anthem.community_post_views FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "community_views_read" ON anthem.community_post_views;
CREATE POLICY "community_views_read"
  ON anthem.community_post_views FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_blocks_own" ON anthem.user_blocks;
CREATE POLICY "user_blocks_own"
  ON anthem.user_blocks FOR ALL
  TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

GRANT SELECT ON anthem.community_post_likes TO anon, authenticated;
GRANT INSERT, DELETE ON anthem.community_post_likes TO authenticated;
GRANT SELECT, INSERT, DELETE ON anthem.community_post_bookmarks TO authenticated;
GRANT SELECT, INSERT ON anthem.community_post_views TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON anthem.user_blocks TO authenticated;

-- Authors may soft-delete (hide) own posts
DROP POLICY IF EXISTS "community_posts_author_delete" ON anthem.community_posts;
CREATE POLICY "community_posts_author_delete"
  ON anthem.community_posts FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

GRANT DELETE ON anthem.community_posts TO authenticated;
