-- Aplus1 Jobs 2.0 schema extensions (anthem schema)
-- Run via Solo-Code/scripts/supabase-push-via-api.sh or apply manually

-- profiles: Open for Work
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS open_for_work boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability_status text,
  ADD COLUMN IF NOT EXISTS hourly_rate_min integer,
  ADD COLUMN IF NOT EXISTS daily_rate_min integer,
  ADD COLUMN IF NOT EXISTS project_rate_note text,
  ADD COLUMN IF NOT EXISTS open_for_work_badge text;

COMMENT ON COLUMN public.profiles.open_for_work IS 'Show Available for Work badge on profile';
COMMENT ON COLUMN public.profiles.availability_status IS 'immediate | 1_week | 1_month';

-- job_posts extensions
ALTER TABLE anthem.job_posts
  ADD COLUMN IF NOT EXISTS deliverables text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reference_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS headcount integer,
  ADD COLUMN IF NOT EXISTS application_methods text[] DEFAULT '{portfolio}',
  ADD COLUMN IF NOT EXISTS ready_to_start text,
  ADD COLUMN IF NOT EXISTS poster_entity_type text,
  ADD COLUMN IF NOT EXISTS posted_as_studio_id uuid REFERENCES public.studios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS show_profile_badge boolean NOT NULL DEFAULT false;

-- Migrate poster_role -> poster_entity_type
UPDATE anthem.job_posts SET poster_entity_type = 'brand' WHERE poster_entity_type IS NULL AND poster_role = 'company';
UPDATE anthem.job_posts SET poster_entity_type = 'personal' WHERE poster_entity_type IS NULL AND poster_role = 'freelancer';
UPDATE anthem.job_posts SET poster_entity_type = 'studio' WHERE poster_entity_type IS NULL AND poster_role = 'studio';
UPDATE anthem.job_posts SET poster_entity_type = 'personal' WHERE poster_entity_type IS NULL;

-- job_applications pipeline
ALTER TABLE anthem.job_applications
  ADD COLUMN IF NOT EXISTS proposed_rate_min integer,
  ADD COLUMN IF NOT EXISTS proposed_rate_max integer,
  ADD COLUMN IF NOT EXISTS ready_date date,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS attached_cv_url text;

-- Expand application status check (contacted, hired) — drop/recreate if exists
DO $$
BEGIN
  ALTER TABLE anthem.job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;
  ALTER TABLE anthem.job_applications
    ADD CONSTRAINT job_applications_status_check
    CHECK (status IN ('pending', 'shortlisted', 'rejected', 'accepted', 'contacted', 'hired'));
EXCEPTION WHEN others THEN NULL;
END $$;

UPDATE anthem.job_applications SET status = 'hired' WHERE status = 'accepted';

-- saved jobs
CREATE TABLE IF NOT EXISTS anthem.job_saved (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES anthem.job_posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);

ALTER TABLE anthem.job_saved ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_saved_own ON anthem.job_saved;
CREATE POLICY job_saved_own ON anthem.job_saved
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON anthem.job_saved TO authenticated;

-- hiring_requests: link to job posts
ALTER TABLE public.hiring_requests
  ADD COLUMN IF NOT EXISTS job_post_id uuid,
  ADD COLUMN IF NOT EXISTS invited_as text,
  ADD COLUMN IF NOT EXISTS invited_studio_id uuid REFERENCES public.studios(id) ON DELETE SET NULL;

-- studio_members: hiring_manager role (extend check if present)
DO $$
BEGIN
  ALTER TABLE public.studio_members DROP CONSTRAINT IF EXISTS studio_members_role_check;
  ALTER TABLE public.studio_members
    ADD CONSTRAINT studio_members_role_check
    CHECK (role IN ('owner', 'admin', 'member', 'hiring_manager'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- RLS: poster/studio admin can update application status
DROP POLICY IF EXISTS job_applications_poster_update ON anthem.job_applications;
CREATE POLICY job_applications_poster_update ON anthem.job_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM anthem.job_posts jp
      WHERE jp.id = job_applications.job_id
        AND (
          jp.posted_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.studio_members sm
            WHERE sm.studio_id = jp.studio_id
              AND sm.user_id = auth.uid()
              AND sm.role IN ('owner', 'admin', 'hiring_manager')
          )
        )
    )
  );
