-- Aplus1 Jobs 2.0 — bootstrap missing anthem jobs tables + schema extensions
-- Unified DB: jobs live in anthem.* (not public.*)

-- ========== helpers ==========
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  ALTER TYPE public.studio_member_role ADD VALUE IF NOT EXISTS 'hiring_manager';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.job_application_status ADD VALUE IF NOT EXISTS 'contacted';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.job_application_status ADD VALUE IF NOT EXISTS 'hired';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== PKs on existing anthem catalog tables ==========
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'anthem' AND t.relname = 'studios' AND c.contype = 'p'
  ) THEN
    ALTER TABLE anthem.studios ALTER COLUMN id SET NOT NULL;
    ALTER TABLE anthem.studios ADD PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'anthem' AND t.relname = 'job_posts' AND c.contype = 'p'
  ) THEN
    ALTER TABLE anthem.job_posts ALTER COLUMN id SET NOT NULL;
    ALTER TABLE anthem.job_posts ADD PRIMARY KEY (id);
  END IF;
END $$;

-- ========== studio_members ==========
CREATE TABLE IF NOT EXISTS anthem.studio_members (
  studio_id uuid NOT NULL REFERENCES anthem.studios(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.studio_member_role NOT NULL DEFAULT 'member',
  credit_title text NOT NULL DEFAULT '',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (studio_id, user_id)
);

INSERT INTO anthem.studio_members (studio_id, user_id, role)
SELECT s.id, s.created_by, 'owner'::public.studio_member_role
FROM anthem.studios s
WHERE s.created_by IS NOT NULL
ON CONFLICT (studio_id, user_id) DO NOTHING;

GRANT SELECT ON anthem.studio_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.studio_members TO authenticated;
GRANT ALL ON anthem.studio_members TO service_role;
ALTER TABLE anthem.studio_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_studio_member(_studio_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = anthem, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM anthem.studio_members
    WHERE studio_id = _studio_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_studio_admin(_studio_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = anthem, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM anthem.studio_members
    WHERE studio_id = _studio_id
      AND user_id = _user_id
      AND role IN ('owner', 'admin', 'hiring_manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_studio_admin(p_studio_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = anthem, public AS $$
  SELECT public.is_studio_admin(p_studio_id, auth.uid())
$$;

REVOKE ALL ON FUNCTION public.is_studio_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_studio_member(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_studio_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_studio_admin(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_studio_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_studio_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Studio members are viewable by everyone" ON anthem.studio_members;
CREATE POLICY "Studio members are viewable by everyone"
  ON anthem.studio_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Studio admins can add members" ON anthem.studio_members;
CREATE POLICY "Studio admins can add members"
  ON anthem.studio_members FOR INSERT TO authenticated
  WITH CHECK (public.is_studio_admin(studio_id, auth.uid()) OR user_id = auth.uid());
DROP POLICY IF EXISTS "Studio admins can update members" ON anthem.studio_members;
CREATE POLICY "Studio admins can update members"
  ON anthem.studio_members FOR UPDATE TO authenticated
  USING (public.is_studio_admin(studio_id, auth.uid()));
DROP POLICY IF EXISTS "Members can leave or admins remove" ON anthem.studio_members;
CREATE POLICY "Members can leave or admins remove"
  ON anthem.studio_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_studio_admin(studio_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_studio_members_user ON anthem.studio_members(user_id);

-- ========== hiring_requests ==========
CREATE TABLE IF NOT EXISTS anthem.hiring_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id text,
  project_title text NOT NULL,
  client_name text NOT NULL,
  email text NOT NULL,
  phone text,
  budget public.hire_budget,
  budget_amount integer,
  deadline text,
  message text,
  status public.hire_status NOT NULL DEFAULT 'ใหม่',
  studio_id uuid REFERENCES anthem.studios(id) ON DELETE CASCADE,
  target_type text NOT NULL DEFAULT 'freelancer'
    CHECK (target_type IN ('freelancer', 'studio')),
  job_post_id uuid REFERENCES anthem.job_posts(id) ON DELETE SET NULL,
  invited_as text,
  invited_studio_id uuid REFERENCES anthem.studios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anthem.hiring_requests
  ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES anthem.studios(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'freelancer',
  ADD COLUMN IF NOT EXISTS budget_amount integer,
  ADD COLUMN IF NOT EXISTS job_post_id uuid REFERENCES anthem.job_posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_as text,
  ADD COLUMN IF NOT EXISTS invited_studio_id uuid REFERENCES anthem.studios(id) ON DELETE SET NULL;

ALTER TABLE anthem.hiring_requests ALTER COLUMN freelancer_id DROP NOT NULL;
ALTER TABLE anthem.hiring_requests ALTER COLUMN budget DROP NOT NULL;
ALTER TABLE anthem.hiring_requests ALTER COLUMN message DROP NOT NULL;

ALTER TABLE anthem.hiring_requests DROP CONSTRAINT IF EXISTS hiring_requests_target_chk;
ALTER TABLE anthem.hiring_requests ADD CONSTRAINT hiring_requests_target_chk
  CHECK (
    (target_type = 'freelancer' AND freelancer_id IS NOT NULL AND studio_id IS NULL)
    OR (target_type = 'studio' AND studio_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS hiring_requests_studio_id_idx
  ON anthem.hiring_requests (studio_id)
  WHERE studio_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.hiring_requests TO authenticated;
GRANT ALL ON anthem.hiring_requests TO service_role;
ALTER TABLE anthem.hiring_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view requests" ON anthem.hiring_requests;
CREATE POLICY "Anyone can view requests"
  ON anthem.hiring_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = freelancer_id
    OR auth.uid() = client_id
    OR (studio_id IS NOT NULL AND public.is_studio_admin(studio_id))
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Freelancer can update their requests" ON anthem.hiring_requests;
DROP POLICY IF EXISTS "Participants can update hiring requests" ON anthem.hiring_requests;
CREATE POLICY "Participants can update hiring requests"
  ON anthem.hiring_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = freelancer_id
    OR auth.uid() = client_id
    OR (studio_id IS NOT NULL AND public.is_studio_admin(studio_id))
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = freelancer_id
    OR auth.uid() = client_id
    OR (studio_id IS NOT NULL AND public.is_studio_admin(studio_id))
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Authenticated users can create requests" ON anthem.hiring_requests;
CREATE POLICY "Authenticated users can create requests"
  ON anthem.hiring_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = client_id
    AND (
      (target_type = 'freelancer' AND freelancer_id IS NOT NULL)
      OR (target_type = 'studio' AND studio_id IS NOT NULL)
    )
  );

DROP TRIGGER IF EXISTS hiring_requests_updated ON anthem.hiring_requests;
CREATE TRIGGER hiring_requests_updated
  BEFORE UPDATE ON anthem.hiring_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== job_applications ==========
CREATE TABLE IF NOT EXISTS anthem.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES anthem.job_posts(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter text NOT NULL DEFAULT '',
  portfolio_project_ids uuid[] NOT NULL DEFAULT '{}',
  status public.job_application_status NOT NULL DEFAULT 'pending',
  proposed_rate_min integer,
  proposed_rate_max integer,
  ready_date date,
  viewed_at timestamptz,
  contacted_at timestamptz,
  attached_cv_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, applicant_id)
);

ALTER TABLE anthem.job_applications
  ADD COLUMN IF NOT EXISTS proposed_rate_min integer,
  ADD COLUMN IF NOT EXISTS proposed_rate_max integer,
  ADD COLUMN IF NOT EXISTS ready_date date,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS attached_cv_url text;

UPDATE anthem.job_applications SET status = 'hired'::public.job_application_status
WHERE status = 'accepted'::public.job_application_status;

GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.job_applications TO authenticated;
GRANT ALL ON anthem.job_applications TO service_role;
ALTER TABLE anthem.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicant or studio admin views applications" ON anthem.job_applications;
CREATE POLICY "Applicant or studio admin views applications"
  ON anthem.job_applications FOR SELECT TO authenticated
  USING (
    applicant_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM anthem.job_posts j
      WHERE j.id = job_id
        AND (
          j.posted_by = auth.uid()
          OR public.is_studio_admin(j.studio_id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "Authenticated users apply" ON anthem.job_applications;
CREATE POLICY "Authenticated users apply"
  ON anthem.job_applications FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid());

DROP POLICY IF EXISTS "Studio admins update application status" ON anthem.job_applications;
CREATE POLICY "Studio admins update application status"
  ON anthem.job_applications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM anthem.job_posts j
      WHERE j.id = job_id
        AND (
          j.posted_by = auth.uid()
          OR public.is_studio_admin(j.studio_id, auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS job_applications_poster_update ON anthem.job_applications;
CREATE POLICY job_applications_poster_update ON anthem.job_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM anthem.job_posts jp
      WHERE jp.id = job_applications.job_id
        AND (
          jp.posted_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM anthem.studio_members sm
            WHERE sm.studio_id = jp.studio_id
              AND sm.user_id = auth.uid()
              AND sm.role IN ('owner', 'admin', 'hiring_manager')
          )
        )
    )
  );

DROP POLICY IF EXISTS "Applicant withdraws own application" ON anthem.job_applications;
CREATE POLICY "Applicant withdraws own application"
  ON anthem.job_applications FOR DELETE TO authenticated
  USING (applicant_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bump_job_applicants_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = anthem, public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE anthem.job_posts
    SET applicants_count = COALESCE(applicants_count, 0) + 1, updated_at = now()
    WHERE id = NEW.job_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE anthem.job_posts
    SET applicants_count = GREATEST(COALESCE(applicants_count, 0) - 1, 0), updated_at = now()
    WHERE id = OLD.job_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_bump_job_applicants ON anthem.job_applications;
CREATE TRIGGER trg_bump_job_applicants
  AFTER INSERT OR DELETE ON anthem.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.bump_job_applicants_count();

DROP TRIGGER IF EXISTS trg_job_applications_updated_at ON anthem.job_applications;
CREATE TRIGGER trg_job_applications_updated_at
  BEFORE UPDATE ON anthem.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_job_applications_job ON anthem.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON anthem.job_applications(applicant_id);

-- ========== profiles: Open for Work ==========
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS open_for_work boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS availability_status text,
  ADD COLUMN IF NOT EXISTS hourly_rate_min integer,
  ADD COLUMN IF NOT EXISTS daily_rate_min integer,
  ADD COLUMN IF NOT EXISTS project_rate_note text,
  ADD COLUMN IF NOT EXISTS open_for_work_badge text;

COMMENT ON COLUMN public.profiles.open_for_work IS 'Show Available for Work badge on profile';
COMMENT ON COLUMN public.profiles.availability_status IS 'immediate | 1_week | 1_month';

-- ========== job_posts extensions ==========
ALTER TABLE anthem.job_posts
  ADD COLUMN IF NOT EXISTS deliverables text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reference_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS headcount integer,
  ADD COLUMN IF NOT EXISTS application_methods text[] DEFAULT '{portfolio}',
  ADD COLUMN IF NOT EXISTS ready_to_start text,
  ADD COLUMN IF NOT EXISTS poster_entity_type text,
  ADD COLUMN IF NOT EXISTS posted_as_studio_id uuid REFERENCES anthem.studios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS show_profile_badge boolean NOT NULL DEFAULT false;

UPDATE anthem.job_posts SET poster_entity_type = 'brand'
WHERE poster_entity_type IS NULL AND poster_role = 'company';
UPDATE anthem.job_posts SET poster_entity_type = 'personal'
WHERE poster_entity_type IS NULL AND poster_role = 'freelancer';
UPDATE anthem.job_posts SET poster_entity_type = 'studio'
WHERE poster_entity_type IS NULL AND poster_role = 'studio';
UPDATE anthem.job_posts SET poster_entity_type = 'personal'
WHERE poster_entity_type IS NULL;

-- ========== saved jobs ==========
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
