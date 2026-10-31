-- Objects "Saved" hearts live in the database, so they follow the user across devices.
-- Before this they were kept in the browser only. Guests still keep them in the browser; the client
-- copies them here once the user signs in.

CREATE TABLE IF NOT EXISTS anthem.creator_object_bookmarks (
  object_id uuid NOT NULL REFERENCES anthem.creator_objects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (object_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_object_bookmarks_user
  ON anthem.creator_object_bookmarks (user_id, created_at DESC);

ALTER TABLE anthem.creator_object_bookmarks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON anthem.creator_object_bookmarks FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON anthem.creator_object_bookmarks TO authenticated;
GRANT ALL ON anthem.creator_object_bookmarks TO service_role;

-- Private to the person who saved: nobody else can see who saved what.
DROP POLICY IF EXISTS creator_object_bookmarks_read_own ON anthem.creator_object_bookmarks;
CREATE POLICY creator_object_bookmarks_read_own ON anthem.creator_object_bookmarks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS creator_object_bookmarks_insert_own ON anthem.creator_object_bookmarks;
CREATE POLICY creator_object_bookmarks_insert_own ON anthem.creator_object_bookmarks
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS creator_object_bookmarks_delete_own ON anthem.creator_object_bookmarks;
CREATE POLICY creator_object_bookmarks_delete_own ON anthem.creator_object_bookmarks
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
