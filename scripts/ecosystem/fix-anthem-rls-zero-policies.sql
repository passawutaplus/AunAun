-- Restore RLS policies for Anthem tables that had RLS ON + 0 policies
-- (same class of bug as project_comments: client writes/reads denied as 42501).
-- Also add project_comments rate-limit / duplicate spam guard.

-- ---------------------------------------------------------------------------
-- anthem.job_posts
-- ---------------------------------------------------------------------------
ALTER TABLE anthem.job_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_posts_select_open ON anthem.job_posts;
CREATE POLICY job_posts_select_open ON anthem.job_posts
  FOR SELECT TO anon, authenticated
  USING (status = 'open');

DROP POLICY IF EXISTS job_posts_select_own ON anthem.job_posts;
CREATE POLICY job_posts_select_own ON anthem.job_posts
  FOR SELECT TO authenticated
  USING (
    posted_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      studio_id IS NOT NULL
      AND public.is_studio_member(studio_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS job_posts_insert_own ON anthem.job_posts;
CREATE POLICY job_posts_insert_own ON anthem.job_posts
  FOR INSERT TO authenticated
  WITH CHECK (posted_by = auth.uid());

DROP POLICY IF EXISTS job_posts_update_own ON anthem.job_posts;
CREATE POLICY job_posts_update_own ON anthem.job_posts
  FOR UPDATE TO authenticated
  USING (
    posted_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      studio_id IS NOT NULL
      AND public.is_studio_admin(studio_id)
    )
  )
  WITH CHECK (
    posted_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      studio_id IS NOT NULL
      AND public.is_studio_admin(studio_id)
    )
  );

DROP POLICY IF EXISTS job_posts_delete_own ON anthem.job_posts;
CREATE POLICY job_posts_delete_own ON anthem.job_posts
  FOR DELETE TO authenticated
  USING (
    posted_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::public.app_role)
  );

GRANT SELECT ON anthem.job_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON anthem.job_posts TO authenticated;
GRANT ALL ON anthem.job_posts TO service_role;

-- ---------------------------------------------------------------------------
-- anthem.post_boosts — client read only; writes via SECURITY DEFINER RPCs
-- ---------------------------------------------------------------------------
ALTER TABLE anthem.post_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_boosts_owner_select ON anthem.post_boosts;
CREATE POLICY post_boosts_owner_select ON anthem.post_boosts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS post_boosts_public_active ON anthem.post_boosts;
CREATE POLICY post_boosts_public_active ON anthem.post_boosts
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND (end_at IS NULL OR end_at > now()));

REVOKE INSERT, UPDATE, DELETE ON anthem.post_boosts FROM authenticated;
GRANT SELECT ON anthem.post_boosts TO anon, authenticated;
GRANT ALL ON anthem.post_boosts TO service_role;

-- ---------------------------------------------------------------------------
-- anthem.community_notification_receipts — recipient can read own rows
-- ---------------------------------------------------------------------------
ALTER TABLE anthem.community_notification_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_notification_receipts_select_own
  ON anthem.community_notification_receipts;
CREATE POLICY community_notification_receipts_select_own
  ON anthem.community_notification_receipts
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS community_notification_receipts_delete_own
  ON anthem.community_notification_receipts;
CREATE POLICY community_notification_receipts_delete_own
  ON anthem.community_notification_receipts
  FOR DELETE TO authenticated
  USING (recipient_id = auth.uid());

REVOKE INSERT, UPDATE ON anthem.community_notification_receipts FROM authenticated;
GRANT SELECT, DELETE ON anthem.community_notification_receipts TO authenticated;
GRANT ALL ON anthem.community_notification_receipts TO service_role;

-- ---------------------------------------------------------------------------
-- project_comments: rate limit + duplicate cooldown (spam guard)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION anthem.project_comment_spam_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  _recent_min int;
  _recent_hour int;
  _dup int;
BEGIN
  IF NEW.user_id IS DISTINCT FROM auth.uid() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'AUTH: user_id ไม่ตรงกับผู้ใช้ที่เข้าสู่ระบบ';
  END IF;

  IF length(trim(coalesce(NEW.content, ''))) < 1 THEN
    RAISE EXCEPTION 'INVALID: พิมพ์ข้อความก่อนส่ง';
  END IF;

  IF length(NEW.content) > 2000 THEN
    RAISE EXCEPTION 'INVALID: คอมเมนต์ไม่เกิน 2000 ตัวอักษร';
  END IF;

  SELECT count(*) INTO _recent_min
  FROM anthem.project_comments
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 minute';

  IF _recent_min >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ส่งคอมเมนต์ถี่เกินไป — รอสักครู่แล้วลองใหม่';
  END IF;

  SELECT count(*) INTO _recent_hour
  FROM anthem.project_comments
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 hour';

  IF _recent_hour >= 20 THEN
    RAISE EXCEPTION 'RATE_LIMIT: คอมเมนต์ได้ไม่เกิน 20 ครั้งต่อชั่วโมง';
  END IF;

  SELECT count(*) INTO _dup
  FROM anthem.project_comments
  WHERE user_id = NEW.user_id
    AND project_id = NEW.project_id
    AND content = trim(NEW.content)
    AND created_at > now() - interval '2 minutes';

  IF _dup > 0 THEN
    RAISE EXCEPTION 'RATE_LIMIT: ข้อความซ้ำ — รอสักครู่ก่อนส่งอีกครั้ง';
  END IF;

  NEW.content := trim(NEW.content);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_comment_spam_guard ON anthem.project_comments;
CREATE TRIGGER trg_project_comment_spam_guard
  BEFORE INSERT ON anthem.project_comments
  FOR EACH ROW EXECUTE FUNCTION anthem.project_comment_spam_guard();

CREATE INDEX IF NOT EXISTS idx_project_comments_user_created
  ON anthem.project_comments (user_id, created_at DESC);
