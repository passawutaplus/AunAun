-- Downloadable links + files on portfolio projects (with scan status).
-- Primary table: anthem.projects (Aplus1 client routes via schemaForTable).

ALTER TABLE IF EXISTS anthem.projects
  ADD COLUMN IF NOT EXISTS project_assets jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN anthem.projects.project_assets IS
  'Downloadable links/files with scan_status (pending|clean|blocked)';

-- Legacy mirror (older deployments only)
ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS project_assets jsonb NOT NULL DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';