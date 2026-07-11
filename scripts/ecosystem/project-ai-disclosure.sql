-- Optional AI-assisted disclosure on portfolio projects (structure-safe, re-runnable).
-- Focus: creators who use AI for images / process transparency.

ALTER TABLE IF EXISTS anthem.projects
  ADD COLUMN IF NOT EXISTS ai_assisted boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS anthem.projects
  ADD COLUMN IF NOT EXISTS ai_disclosure_note text NOT NULL DEFAULT '';

COMMENT ON COLUMN anthem.projects.ai_assisted IS
  'Creator opted to disclose AI use in this project (optional, not required to publish).';

COMMENT ON COLUMN anthem.projects.ai_disclosure_note IS
  'Short note on how AI was used (e.g. image gen, upscale). Max enforced in app.';

-- Legacy mirror
ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS ai_assisted boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS ai_disclosure_note text NOT NULL DEFAULT '';

NOTIFY pgrst, 'reload schema';
