-- Redesign 2026: works the team keeps off the home page (test uploads and the like).
-- The work itself is untouched: still published, on its owner's profile, in search and by link.
-- Only the home grid of the new design reads this list. Nobody can write it through the API
-- (no insert/update/delete policy): use the SQL editor or the service role.
-- Undo: supabase/manual/rollback-20261127210000_redesign_home_hidden_projects.sql

CREATE TABLE IF NOT EXISTS anthem.home_hidden_projects (
  project_id uuid PRIMARY KEY REFERENCES anthem.projects(id) ON DELETE CASCADE,
  note text,
  hidden_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anthem.home_hidden_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS home_hidden_projects_read ON anthem.home_hidden_projects;
CREATE POLICY home_hidden_projects_read ON anthem.home_hidden_projects
  FOR SELECT TO anon, authenticated USING (true);

-- Visitors may read which works are off the home page, not the team's note.
REVOKE ALL ON anthem.home_hidden_projects FROM anon, authenticated;
GRANT SELECT (project_id) ON anthem.home_hidden_projects TO anon, authenticated;
