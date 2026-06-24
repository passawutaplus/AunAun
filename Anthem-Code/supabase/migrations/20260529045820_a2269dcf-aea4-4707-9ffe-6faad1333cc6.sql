
-- ========== ENUMS ==========
CREATE TYPE public.studio_member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE public.studio_formation_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE public.studio_invite_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.job_status AS ENUM ('open', 'closed', 'filled');
CREATE TYPE public.job_budget_type AS ENUM ('fixed', 'hourly', 'monthly');
CREATE TYPE public.job_location_type AS ENUM ('remote', 'onsite', 'hybrid');
CREATE TYPE public.job_application_status AS ENUM ('pending', 'shortlisted', 'rejected', 'accepted');

-- ========== PROFILE / PROJECT ADDITIONS ==========
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_studio_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS studio_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS credited_user_ids uuid[] NOT NULL DEFAULT '{}';

-- ========== STUDIOS ==========
CREATE TABLE public.studios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  member_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.studios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studios TO authenticated;
GRANT ALL ON public.studios TO service_role;
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

-- ========== STUDIO MEMBERS ==========
CREATE TABLE public.studio_members (
  studio_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role public.studio_member_role NOT NULL DEFAULT 'member',
  credit_title text NOT NULL DEFAULT '',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (studio_id, user_id)
);
GRANT SELECT ON public.studio_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_members TO authenticated;
GRANT ALL ON public.studio_members TO service_role;
ALTER TABLE public.studio_members ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid recursion
CREATE OR REPLACE FUNCTION public.is_studio_member(_studio_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.studio_members WHERE studio_id = _studio_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_studio_admin(_studio_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.studio_members WHERE studio_id = _studio_id AND user_id = _user_id AND role IN ('owner','admin'))
$$;

REVOKE EXECUTE ON FUNCTION public.is_studio_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_studio_member(uuid, uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.is_studio_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_studio_admin(uuid, uuid) TO authenticated, service_role;

-- Studios policies
CREATE POLICY "Studios are viewable by everyone" ON public.studios FOR SELECT USING (true);
CREATE POLICY "Authenticated can create studios" ON public.studios FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Studio admins can update" ON public.studios FOR UPDATE TO authenticated USING (public.is_studio_admin(id, auth.uid()));
CREATE POLICY "Studio owners can delete" ON public.studios FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.studio_members WHERE studio_id = studios.id AND user_id = auth.uid() AND role = 'owner')
);

-- Studio members policies (members visible publicly for studio profile page)
CREATE POLICY "Studio members are viewable by everyone" ON public.studio_members FOR SELECT USING (true);
CREATE POLICY "Studio admins can add members" ON public.studio_members FOR INSERT TO authenticated WITH CHECK (
  public.is_studio_admin(studio_id, auth.uid()) OR user_id = auth.uid()
);
CREATE POLICY "Studio admins can update members" ON public.studio_members FOR UPDATE TO authenticated USING (
  public.is_studio_admin(studio_id, auth.uid())
);
CREATE POLICY "Members can leave or admins remove" ON public.studio_members FOR DELETE TO authenticated USING (
  user_id = auth.uid() OR public.is_studio_admin(studio_id, auth.uid())
);

-- ========== STUDIO FORMATION ==========
CREATE TABLE public.studio_formation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL,
  proposed_name text NOT NULL,
  proposed_slug text NOT NULL,
  proposed_tagline text NOT NULL DEFAULT '',
  status public.studio_formation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_studio_id uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_formation_requests TO authenticated;
GRANT ALL ON public.studio_formation_requests TO service_role;
ALTER TABLE public.studio_formation_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.studio_formation_invites (
  formation_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status public.studio_invite_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  PRIMARY KEY (formation_id, invitee_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_formation_invites TO authenticated;
GRANT ALL ON public.studio_formation_invites TO service_role;
ALTER TABLE public.studio_formation_invites ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_formation_participant(_formation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.studio_formation_requests r
    WHERE r.id = _formation_id AND (r.founder_id = _user_id OR EXISTS (
      SELECT 1 FROM public.studio_formation_invites i WHERE i.formation_id = _formation_id AND i.invitee_id = _user_id
    ))
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_formation_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_formation_participant(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Founder or invitee can view formation" ON public.studio_formation_requests FOR SELECT TO authenticated USING (
  founder_id = auth.uid() OR public.is_formation_participant(id, auth.uid())
);
CREATE POLICY "Founder creates formation" ON public.studio_formation_requests FOR INSERT TO authenticated WITH CHECK (founder_id = auth.uid());
CREATE POLICY "Founder updates formation" ON public.studio_formation_requests FOR UPDATE TO authenticated USING (founder_id = auth.uid());
CREATE POLICY "Founder deletes formation" ON public.studio_formation_requests FOR DELETE TO authenticated USING (founder_id = auth.uid());

CREATE POLICY "Participants view invites" ON public.studio_formation_invites FOR SELECT TO authenticated USING (
  invitee_id = auth.uid() OR public.is_formation_participant(formation_id, auth.uid())
);
CREATE POLICY "Founder creates invites" ON public.studio_formation_invites FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.studio_formation_requests r WHERE r.id = formation_id AND r.founder_id = auth.uid())
);
CREATE POLICY "Invitee updates own invite" ON public.studio_formation_invites FOR UPDATE TO authenticated USING (invitee_id = auth.uid());
CREATE POLICY "Founder or invitee deletes" ON public.studio_formation_invites FOR DELETE TO authenticated USING (
  invitee_id = auth.uid() OR EXISTS (SELECT 1 FROM public.studio_formation_requests r WHERE r.id = formation_id AND r.founder_id = auth.uid())
);

-- Trigger: when all invites accepted, create studio
CREATE OR REPLACE FUNCTION public.complete_studio_formation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pending int;
  v_declined int;
  v_request record;
  v_new_studio_id uuid;
  v_invitee uuid;
BEGIN
  SELECT * INTO v_request FROM public.studio_formation_requests WHERE id = NEW.formation_id;
  IF v_request.status <> 'pending' THEN RETURN NEW; END IF;

  SELECT COUNT(*) FILTER (WHERE status = 'pending'),
         COUNT(*) FILTER (WHERE status = 'declined')
    INTO v_pending, v_declined
  FROM public.studio_formation_invites WHERE formation_id = NEW.formation_id;

  IF v_declined > 0 THEN
    UPDATE public.studio_formation_requests SET status = 'cancelled', completed_at = now() WHERE id = NEW.formation_id;
    RETURN NEW;
  END IF;

  IF v_pending = 0 THEN
    INSERT INTO public.studios (slug, name, tagline, created_by, member_count)
    VALUES (v_request.proposed_slug, v_request.proposed_name, v_request.proposed_tagline, v_request.founder_id, 1)
    RETURNING id INTO v_new_studio_id;

    INSERT INTO public.studio_members (studio_id, user_id, role)
    VALUES (v_new_studio_id, v_request.founder_id, 'owner');

    FOR v_invitee IN SELECT invitee_id FROM public.studio_formation_invites WHERE formation_id = NEW.formation_id LOOP
      INSERT INTO public.studio_members (studio_id, user_id, role) VALUES (v_new_studio_id, v_invitee, 'member');
    END LOOP;

    UPDATE public.studios SET member_count = (SELECT COUNT(*) FROM public.studio_members WHERE studio_id = v_new_studio_id) WHERE id = v_new_studio_id;

    UPDATE public.studio_formation_requests SET status = 'completed', completed_at = now(), created_studio_id = v_new_studio_id WHERE id = NEW.formation_id;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_complete_studio_formation
AFTER UPDATE OF status ON public.studio_formation_invites
FOR EACH ROW WHEN (NEW.status IN ('accepted','declined'))
EXECUTE FUNCTION public.complete_studio_formation();

-- ========== JOB POSTS ==========
CREATE TABLE public.job_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id uuid NOT NULL,
  posted_by uuid NOT NULL,
  title text NOT NULL,
  role_category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  budget_min integer,
  budget_max integer,
  budget_type public.job_budget_type NOT NULL DEFAULT 'fixed',
  location_type public.job_location_type NOT NULL DEFAULT 'remote',
  location text NOT NULL DEFAULT '',
  deadline date,
  status public.job_status NOT NULL DEFAULT 'open',
  applicants_count integer NOT NULL DEFAULT 0,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.job_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_posts TO authenticated;
GRANT ALL ON public.job_posts TO service_role;
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open jobs viewable by everyone" ON public.job_posts FOR SELECT USING (
  status = 'open' OR public.is_studio_member(studio_id, auth.uid())
);
CREATE POLICY "Studio admins create jobs" ON public.job_posts FOR INSERT TO authenticated WITH CHECK (
  public.is_studio_admin(studio_id, auth.uid()) AND posted_by = auth.uid()
);
CREATE POLICY "Studio admins update jobs" ON public.job_posts FOR UPDATE TO authenticated USING (public.is_studio_admin(studio_id, auth.uid()));
CREATE POLICY "Studio admins delete jobs" ON public.job_posts FOR DELETE TO authenticated USING (public.is_studio_admin(studio_id, auth.uid()));

-- ========== JOB APPLICATIONS ==========
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  applicant_id uuid NOT NULL,
  cover_letter text NOT NULL DEFAULT '',
  portfolio_project_ids uuid[] NOT NULL DEFAULT '{}',
  status public.job_application_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, applicant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicant or studio admin views applications" ON public.job_applications FOR SELECT TO authenticated USING (
  applicant_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.job_posts j WHERE j.id = job_id AND public.is_studio_admin(j.studio_id, auth.uid())
  )
);
CREATE POLICY "Authenticated users apply" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid());
CREATE POLICY "Studio admins update application status" ON public.job_applications FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.job_posts j WHERE j.id = job_id AND public.is_studio_admin(j.studio_id, auth.uid()))
);
CREATE POLICY "Applicant withdraws own application" ON public.job_applications FOR DELETE TO authenticated USING (applicant_id = auth.uid());

-- triggers for applicants_count + updated_at
CREATE OR REPLACE FUNCTION public.bump_job_applicants_count()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.job_posts SET applicants_count = applicants_count + 1, updated_at = now() WHERE id = NEW.job_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.job_posts SET applicants_count = GREATEST(applicants_count - 1, 0), updated_at = now() WHERE id = OLD.job_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_bump_job_applicants
AFTER INSERT OR DELETE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.bump_job_applicants_count();

CREATE TRIGGER trg_studios_updated_at BEFORE UPDATE ON public.studios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_job_posts_updated_at BEFORE UPDATE ON public.job_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX idx_studio_members_user ON public.studio_members(user_id);
CREATE INDEX idx_job_posts_studio ON public.job_posts(studio_id);
CREATE INDEX idx_job_posts_status ON public.job_posts(status) WHERE status = 'open';
CREATE INDEX idx_job_applications_job ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant ON public.job_applications(applicant_id);
CREATE INDEX idx_projects_studio ON public.projects(studio_id);
CREATE INDEX idx_formation_invites_invitee ON public.studio_formation_invites(invitee_id);
