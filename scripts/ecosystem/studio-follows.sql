-- Studio follows (anthem) — run in Supabase SQL Editor or via migration push

CREATE TABLE IF NOT EXISTS anthem.studio_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  studio_id uuid NOT NULL REFERENCES anthem.studios(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, studio_id)
);

CREATE INDEX IF NOT EXISTS idx_studio_follows_studio
  ON anthem.studio_follows (studio_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_studio_follows_follower
  ON anthem.studio_follows (follower_id, created_at DESC);

ALTER TABLE anthem.studio_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "studio_follows_public_read" ON anthem.studio_follows;
CREATE POLICY "studio_follows_public_read"
  ON anthem.studio_follows FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "studio_follows_own_write" ON anthem.studio_follows;
CREATE POLICY "studio_follows_own_write"
  ON anthem.studio_follows FOR ALL
  TO authenticated
  USING (follower_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());

GRANT SELECT ON anthem.studio_follows TO anon, authenticated;
GRANT INSERT, DELETE ON anthem.studio_follows TO authenticated;
