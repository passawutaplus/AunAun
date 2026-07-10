-- Project series (ชุดผลงาน) — creator case sets linking multiple portfolio projects.
-- Safe to re-run. Primary schema: anthem (Aplus1 client via schemaForTable).

CREATE TABLE IF NOT EXISTS anthem.project_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  client_label text NOT NULL DEFAULT '',
  year int,
  is_public boolean NOT NULL DEFAULT true,
  cover_project_id uuid,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_series_title_len CHECK (char_length(trim(title)) BETWEEN 1 AND 120)
);

CREATE TABLE IF NOT EXISTS anthem.project_series_items (
  series_id uuid NOT NULL REFERENCES anthem.project_series(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  position int NOT NULL DEFAULT 0,
  role_label text NOT NULL DEFAULT '',
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (series_id, project_id)
);

-- MVP: one project belongs to at most one series
CREATE UNIQUE INDEX IF NOT EXISTS project_series_items_project_unique
  ON anthem.project_series_items (project_id);

CREATE INDEX IF NOT EXISTS project_series_owner_updated_idx
  ON anthem.project_series (owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS project_series_items_series_pos_idx
  ON anthem.project_series_items (series_id, position ASC);

-- FK to projects when table exists (anthem or public)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'projects'
  ) THEN
    ALTER TABLE anthem.project_series_items DROP CONSTRAINT IF EXISTS project_series_items_project_fk;
    ALTER TABLE anthem.project_series_items
      ADD CONSTRAINT project_series_items_project_fk
      FOREIGN KEY (project_id) REFERENCES anthem.projects(id) ON DELETE CASCADE;

    ALTER TABLE anthem.project_series DROP CONSTRAINT IF EXISTS project_series_cover_project_fk;
    ALTER TABLE anthem.project_series
      ADD CONSTRAINT project_series_cover_project_fk
      FOREIGN KEY (cover_project_id) REFERENCES anthem.projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION anthem.set_project_series_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_series_updated_at ON anthem.project_series;
CREATE TRIGGER trg_project_series_updated_at
  BEFORE UPDATE ON anthem.project_series
  FOR EACH ROW EXECUTE FUNCTION anthem.set_project_series_updated_at();

ALTER TABLE anthem.project_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.project_series_items ENABLE ROW LEVEL SECURITY;

-- Series: owner full access
DROP POLICY IF EXISTS "project_series_owner_all" ON anthem.project_series;
CREATE POLICY "project_series_owner_all"
  ON anthem.project_series FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Series: public read (empty series still readable by owner only via owner policy;
-- public profile filters to series with published items in the app)
DROP POLICY IF EXISTS "project_series_public_select" ON anthem.project_series;
CREATE POLICY "project_series_public_select"
  ON anthem.project_series FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Items: owner of series
DROP POLICY IF EXISTS "project_series_items_owner_all" ON anthem.project_series_items;
CREATE POLICY "project_series_items_owner_all"
  ON anthem.project_series_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM anthem.project_series s
      WHERE s.id = series_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM anthem.project_series s
      WHERE s.id = series_id AND s.owner_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM anthem.projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

-- Items: public read when series is public
DROP POLICY IF EXISTS "project_series_items_public_select" ON anthem.project_series_items;
CREATE POLICY "project_series_items_public_select"
  ON anthem.project_series_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM anthem.project_series s
      WHERE s.id = series_id AND s.is_public = true
    )
  );

GRANT SELECT ON anthem.project_series TO anon, authenticated;
GRANT ALL ON anthem.project_series TO authenticated, service_role;
GRANT SELECT ON anthem.project_series_items TO anon, authenticated;
GRANT ALL ON anthem.project_series_items TO authenticated, service_role;
