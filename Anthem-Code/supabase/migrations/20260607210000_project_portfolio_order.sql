-- Portfolio display order: pin featured works + manual sort on profile
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.sort_order IS 'Lower = shown first on owner profile (after pinned)';
COMMENT ON COLUMN public.projects.is_pinned IS 'Featured on profile; max 3 per owner (enforced in app)';

CREATE INDEX IF NOT EXISTS idx_projects_owner_portfolio_order
  ON public.projects (owner_id, is_pinned DESC, sort_order ASC, created_at DESC);

-- Backfill sort_order from newest-first per owner
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at DESC) - 1 AS rn
  FROM public.projects
)
UPDATE public.projects p
SET sort_order = ranked.rn
FROM ranked
WHERE p.id = ranked.id;
