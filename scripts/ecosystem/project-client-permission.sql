-- Optional client/agency publish permission confirm (soft, not required to publish).

ALTER TABLE IF EXISTS anthem.projects
  ADD COLUMN IF NOT EXISTS client_permission_confirmed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN anthem.projects.client_permission_confirmed IS
  'Creator confirmed they have permission to publish client/agency work (optional).';

ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS client_permission_confirmed boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';
