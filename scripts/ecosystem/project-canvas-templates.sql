-- User portfolio canvas templates (structure-only). Max 5 per user including seeded defaults.
-- Safe to re-run. Primary schema: anthem (Aplus1 client via schemaForTable).

CREATE TABLE IF NOT EXISTS anthem.project_canvas_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  hint text NOT NULL DEFAULT '',
  source_key text,
  modules jsonb NOT NULL DEFAULT '[]'::jsonb,
  open_context boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_canvas_templates_name_len CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  CONSTRAINT project_canvas_templates_hint_len CHECK (char_length(hint) <= 160),
  CONSTRAINT project_canvas_templates_modules_is_array CHECK (jsonb_typeof(modules) = 'array')
);

CREATE INDEX IF NOT EXISTS project_canvas_templates_user_sort_idx
  ON anthem.project_canvas_templates (user_id, sort_order ASC, created_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS project_canvas_templates_user_source_unique
  ON anthem.project_canvas_templates (user_id, source_key)
  WHERE source_key IS NOT NULL;

CREATE OR REPLACE FUNCTION anthem.set_project_canvas_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_canvas_templates_updated_at ON anthem.project_canvas_templates;
CREATE TRIGGER trg_project_canvas_templates_updated_at
  BEFORE UPDATE ON anthem.project_canvas_templates
  FOR EACH ROW EXECUTE FUNCTION anthem.set_project_canvas_templates_updated_at();

-- Cap at 5 templates per user (including seeded system defaults).
CREATE OR REPLACE FUNCTION anthem.enforce_project_canvas_templates_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  n int;
BEGIN
  SELECT count(*)::int INTO n
  FROM anthem.project_canvas_templates
  WHERE user_id = NEW.user_id;

  IF TG_OP = 'INSERT' AND n >= 5 THEN
    RAISE EXCEPTION 'canvas_templates_limit: max 5 templates per user'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_canvas_templates_limit ON anthem.project_canvas_templates;
CREATE TRIGGER trg_project_canvas_templates_limit
  BEFORE INSERT ON anthem.project_canvas_templates
  FOR EACH ROW EXECUTE FUNCTION anthem.enforce_project_canvas_templates_limit();

ALTER TABLE anthem.project_canvas_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_canvas_templates_owner_all" ON anthem.project_canvas_templates;
CREATE POLICY "project_canvas_templates_owner_all"
  ON anthem.project_canvas_templates FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.project_canvas_templates TO authenticated;
GRANT ALL ON anthem.project_canvas_templates TO service_role;

NOTIFY pgrst, 'reload schema';
