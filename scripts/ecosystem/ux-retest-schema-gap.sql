-- UX retest schema gap (2026-07-01 handoff)
-- Aligns production DB with Anthem client queries (comments, collections, optional RPCs).

-- ========== project_comments threading ==========
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'project_comments'
  ) THEN
    ALTER TABLE anthem.project_comments
      ADD COLUMN IF NOT EXISTS parent_id uuid,
      ADD COLUMN IF NOT EXISTS depth integer NOT NULL DEFAULT 0;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'project_comments_depth_chk'
    ) THEN
      ALTER TABLE anthem.project_comments
        ADD CONSTRAINT project_comments_depth_chk CHECK (depth >= 0 AND depth <= 2);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'project_comments_parent_id_fkey'
    ) THEN
      ALTER TABLE anthem.project_comments
        ADD CONSTRAINT project_comments_parent_id_fkey
        FOREIGN KEY (parent_id) REFERENCES anthem.project_comments(id) ON DELETE CASCADE;
    END IF;
    CREATE INDEX IF NOT EXISTS project_comments_project_idx
      ON anthem.project_comments (project_id, created_at ASC);
  END IF;
END $$;

-- Legacy public mirror (if present on older projects)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'project_comments'
  ) THEN
    ALTER TABLE public.project_comments
      ADD COLUMN IF NOT EXISTS parent_id uuid,
      ADD COLUMN IF NOT EXISTS depth integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ========== collection_items ==========
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'collection_items'
  ) THEN
    ALTER TABLE anthem.collection_items
      ADD COLUMN IF NOT EXISTS added_at timestamptz NOT NULL DEFAULT now();
    CREATE INDEX IF NOT EXISTS collection_items_collection_added_idx
      ON anthem.collection_items (collection_id, added_at DESC);
  END IF;
END $$;

-- ========== job_match_notifications ==========
CREATE TABLE IF NOT EXISTS anthem.job_match_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL,
  match_score numeric NOT NULL DEFAULT 0,
  match_reasons text[] NOT NULL DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_match_notifications_user_idx
  ON anthem.job_match_notifications (user_id, is_dismissed, match_score DESC, created_at DESC);

GRANT SELECT, UPDATE ON anthem.job_match_notifications TO authenticated;
GRANT ALL ON anthem.job_match_notifications TO service_role;
ALTER TABLE anthem.job_match_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job match own read" ON anthem.job_match_notifications;
CREATE POLICY "job match own read"
  ON anthem.job_match_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "job match own update" ON anthem.job_match_notifications;
CREATE POLICY "job match own update"
  ON anthem.job_match_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ========== optional RPC stubs (no-op when ML/ads not configured) ==========
DROP FUNCTION IF EXISTS public.recommend_from_likes(uuid, integer);
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'project_likes'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.recommend_from_likes(_user_id uuid, _limit integer DEFAULT 24)
      RETURNS TABLE (id text)
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = anthem, public
      AS $body$
        SELECT p.id::text
        FROM anthem.project_likes pl
        JOIN anthem.projects p ON p.id = pl.project_id
        WHERE pl.user_id = _user_id
          AND p.status = 'Published'
        ORDER BY pl.created_at DESC
        LIMIT GREATEST(1, LEAST(coalesce(_limit, 24), 50));
      $body$;
    $fn$;
    REVOKE ALL ON FUNCTION public.recommend_from_likes(uuid, integer) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.recommend_from_likes(uuid, integer) TO authenticated, service_role;
  ELSE
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.recommend_from_likes(_user_id uuid, _limit integer DEFAULT 24)
      RETURNS TABLE (id text)
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = anthem, public
      AS $body$
        SELECT NULL::text WHERE false;
      $body$;
    $fn$;
    REVOKE ALL ON FUNCTION public.recommend_from_likes(uuid, integer) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.recommend_from_likes(uuid, integer) TO authenticated, service_role;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.get_active_ads(integer);
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'ad_campaigns'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.get_active_ads(_limit integer DEFAULT 12)
      RETURNS SETOF anthem.ad_campaigns
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = anthem, public
      AS $body$
        SELECT *
        FROM anthem.ad_campaigns
        WHERE status = 'active'
          AND (end_at IS NULL OR end_at > now())
        ORDER BY created_at DESC
        LIMIT GREATEST(1, LEAST(coalesce(_limit, 12), 50));
      $body$;
    $fn$;
    REVOKE ALL ON FUNCTION public.get_active_ads(integer) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.get_active_ads(integer) TO anon, authenticated, service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
