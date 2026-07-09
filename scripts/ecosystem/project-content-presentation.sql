-- Portfolio presentation: structured text blocks + gallery display mode.
-- Primary table: anthem.projects (Aplus1 client routes via schemaForTable).

ALTER TABLE IF EXISTS anthem.projects
  ADD COLUMN IF NOT EXISTS content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS anthem.projects
  ADD COLUMN IF NOT EXISTS gallery_display_mode text NOT NULL DEFAULT 'gallery';

COMMENT ON COLUMN anthem.projects.content_blocks IS
  'Ordered narrative blocks: heading | heading_body | body';

ALTER TABLE IF EXISTS anthem.projects
  ADD COLUMN IF NOT EXISTS grid_layout text NOT NULL DEFAULT 'four_quad';

COMMENT ON COLUMN anthem.projects.grid_layout IS
  'Photo grid template: two_stack | two_side | three_split | four_quad';

-- Legacy mirror (older deployments only)
ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS grid_layout text NOT NULL DEFAULT 'four_quad';

-- Legacy mirror (older deployments only)
ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS gallery_display_mode text NOT NULL DEFAULT 'gallery';

NOTIFY pgrst, 'reload schema';
