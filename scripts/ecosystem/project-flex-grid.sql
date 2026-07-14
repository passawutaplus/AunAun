-- Flex Grid editor mode: separate canvas payload + active mode flag.
-- Primary table: anthem.projects (Aplus1 client routes via schemaForTable).

ALTER TABLE IF EXISTS anthem.projects
  ADD COLUMN IF NOT EXISTS editor_mode text NOT NULL DEFAULT 'casual';

ALTER TABLE IF EXISTS anthem.projects
  ADD COLUMN IF NOT EXISTS flex_grid_layout jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN anthem.projects.editor_mode IS
  'Active portfolio canvas mode: casual | flex_grid';

COMMENT ON COLUMN anthem.projects.flex_grid_layout IS
  'Flex Grid canvas JSON: version, canvasWidth, grid settings, boards[].modules[]';

-- Legacy mirror (older deployments only)
ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS editor_mode text NOT NULL DEFAULT 'casual';

ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS flex_grid_layout jsonb NOT NULL DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
