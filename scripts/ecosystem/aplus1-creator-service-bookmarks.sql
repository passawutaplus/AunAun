-- Bookmark creator packages so clients can return to them later.
-- Related: anthem.creator_services, community_post_bookmarks / job_saved patterns.

CREATE TABLE IF NOT EXISTS anthem.creator_service_bookmarks (
  service_id uuid NOT NULL REFERENCES anthem.creator_services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_service_bookmarks_user
  ON anthem.creator_service_bookmarks (user_id, created_at DESC);

ALTER TABLE anthem.creator_service_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creator_service_bookmarks_own ON anthem.creator_service_bookmarks;
CREATE POLICY creator_service_bookmarks_own ON anthem.creator_service_bookmarks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON anthem.creator_service_bookmarks TO authenticated;

NOTIFY pgrst, 'reload schema';
