-- Security hardening round 2: tighten policies (RPC revoke completed in 20260711224000)
DROP POLICY IF EXISTS "anyone insert share" ON anthem.image_shares;

DO $tag$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'anthem' AND table_name = 'community_post_views' AND column_name = 'post_id'
  ) THEN
    DROP POLICY IF EXISTS "community_views_insert" ON anthem.community_post_views;
    CREATE POLICY "community_views_insert"
      ON anthem.community_post_views FOR INSERT
      WITH CHECK (post_id IS NOT NULL);
  END IF;
END $tag$;

