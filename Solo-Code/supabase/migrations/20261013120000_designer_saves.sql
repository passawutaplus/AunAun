-- Heart a designer on the Designers feed: a private list shown under Portfolio → Designers.
-- Rows are visible only to the person who saved them; the designer is not told who saved them.

CREATE TABLE IF NOT EXISTS anthem.designer_saves (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  designer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, designer_id),
  CONSTRAINT designer_saves_not_self CHECK (user_id <> designer_id)
);

CREATE INDEX IF NOT EXISTS designer_saves_user_created_idx
  ON anthem.designer_saves (user_id, created_at DESC);

-- Cascade deletes from auth.users look rows up by designer_id.
CREATE INDEX IF NOT EXISTS designer_saves_designer_idx
  ON anthem.designer_saves (designer_id);

ALTER TABLE anthem.designer_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS designer_saves_own ON anthem.designer_saves;
CREATE POLICY designer_saves_own ON anthem.designer_saves
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON anthem.designer_saves FROM anon, PUBLIC;
GRANT SELECT, INSERT, DELETE ON anthem.designer_saves TO authenticated;
