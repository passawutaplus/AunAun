-- Aplus1 hiring board: juristic hiring orgs + job contact/requirements + apply chat
-- Idempotent. Run on unified project (anthem + shared).

-- ========== hiring organizations ==========
CREATE TABLE IF NOT EXISTS anthem.hiring_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name text NOT NULL,
  display_name text NOT NULL,
  org_type text NOT NULL DEFAULT 'company'
    CHECK (org_type IN ('company', 'partnership', 'studio_juristic')),
  tax_id text NOT NULL,
  province text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  website text,
  social_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  logo_url text,
  description text,
  category text,
  document_url text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'needs_info', 'approved', 'suspended')),
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hiring_orgs_created_by_idx ON anthem.hiring_organizations (created_by);
CREATE INDEX IF NOT EXISTS hiring_orgs_status_idx ON anthem.hiring_organizations (status);

CREATE TABLE IF NOT EXISTS anthem.hiring_org_members (
  org_id uuid NOT NULL REFERENCES anthem.hiring_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS hiring_org_members_user_idx ON anthem.hiring_org_members (user_id);

DROP TRIGGER IF EXISTS hiring_organizations_updated ON anthem.hiring_organizations;
CREATE TRIGGER hiring_organizations_updated
  BEFORE UPDATE ON anthem.hiring_organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON anthem.hiring_organizations TO anon, authenticated;
GRANT INSERT, UPDATE ON anthem.hiring_organizations TO authenticated;
GRANT ALL ON anthem.hiring_organizations TO service_role;

GRANT SELECT ON anthem.hiring_org_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON anthem.hiring_org_members TO authenticated;
GRANT ALL ON anthem.hiring_org_members TO service_role;

ALTER TABLE anthem.hiring_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.hiring_org_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_hiring_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM anthem.hiring_org_members
    WHERE org_id = _org_id AND user_id = _user_id
  )
$$;

REVOKE ALL ON FUNCTION public.is_hiring_org_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_hiring_org_member(uuid, uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS hiring_orgs_select ON anthem.hiring_organizations;
CREATE POLICY hiring_orgs_select ON anthem.hiring_organizations
  FOR SELECT TO anon, authenticated
  USING (
    status = 'approved'
    OR (
      auth.uid() IS NOT NULL
      AND (
        created_by = auth.uid()
        OR public.is_hiring_org_member(id, auth.uid())
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    )
  );

DROP POLICY IF EXISTS hiring_orgs_insert ON anthem.hiring_organizations;
CREATE POLICY hiring_orgs_insert ON anthem.hiring_organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND status IN ('draft', 'pending')
  );

DROP POLICY IF EXISTS hiring_orgs_update ON anthem.hiring_organizations;
CREATE POLICY hiring_orgs_update ON anthem.hiring_organizations
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      created_by = auth.uid()
      AND status IN ('draft', 'pending', 'needs_info')
    )
  );

CREATE OR REPLACE FUNCTION anthem.hiring_org_guard_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'approved'
     AND NEW.created_by IS NOT DISTINCT FROM auth.uid()
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'cannot self-approve hiring organization';
  END IF;
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IN ('approved', 'suspended') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'org status requires admin';
  END IF;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.reviewed_by := OLD.reviewed_by;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hiring_org_guard_status ON anthem.hiring_organizations;
CREATE TRIGGER hiring_org_guard_status
  BEFORE UPDATE ON anthem.hiring_organizations
  FOR EACH ROW EXECUTE FUNCTION anthem.hiring_org_guard_status();

DROP POLICY IF EXISTS hiring_org_members_select ON anthem.hiring_org_members;
CREATE POLICY hiring_org_members_select ON anthem.hiring_org_members
  FOR SELECT TO anon, authenticated
  USING (
    user_id = auth.uid()
    OR public.is_hiring_org_member(org_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS hiring_org_members_insert ON anthem.hiring_org_members;
CREATE POLICY hiring_org_members_insert ON anthem.hiring_org_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Auto-add creator as owner
CREATE OR REPLACE FUNCTION anthem.hiring_org_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  INSERT INTO anthem.hiring_org_members (org_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (org_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hiring_org_after_insert ON anthem.hiring_organizations;
CREATE TRIGGER hiring_org_after_insert
  AFTER INSERT ON anthem.hiring_organizations
  FOR EACH ROW EXECUTE FUNCTION anthem.hiring_org_after_insert();

-- ========== job_posts contact / requirements ==========
ALTER TABLE anthem.job_posts
  ADD COLUMN IF NOT EXISTS hiring_org_id uuid REFERENCES anthem.hiring_organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS workplace_address text,
  ADD COLUMN IF NOT EXISTS meeting_location text,
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requirements_must text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS requirements_nice text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS perks text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exclusions_note text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS job_posts_hiring_org_idx ON anthem.job_posts (hiring_org_id);

ALTER TABLE anthem.job_applications
  ADD COLUMN IF NOT EXISTS conversation_id uuid;

DROP POLICY IF EXISTS job_posts_insert_own ON anthem.job_posts;
CREATE POLICY job_posts_insert_own ON anthem.job_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    posted_by = auth.uid()
    AND (
      COALESCE(post_type, 'hiring') <> 'hiring'
      OR (
        hiring_org_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM anthem.hiring_organizations o
          JOIN anthem.hiring_org_members m ON m.org_id = o.id
          WHERE o.id = hiring_org_id
            AND o.status = 'approved'
            AND m.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS job_posts_select_org_member ON anthem.job_posts;
CREATE POLICY job_posts_select_org_member ON anthem.job_posts
  FOR SELECT TO authenticated
  USING (
    hiring_org_id IS NOT NULL
    AND public.is_hiring_org_member(hiring_org_id, auth.uid())
  );

DROP POLICY IF EXISTS job_posts_update_org_member ON anthem.job_posts;
CREATE POLICY job_posts_update_org_member ON anthem.job_posts
  FOR UPDATE TO authenticated
  USING (
    posted_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      hiring_org_id IS NOT NULL
      AND public.is_hiring_org_member(hiring_org_id, auth.uid())
    )
  );

-- ========== open chat after apply ==========
CREATE OR REPLACE FUNCTION public.open_job_application_chat(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  app_applicant uuid;
  app_job uuid;
  app_conv uuid;
  job_owner uuid;
  job_title text;
  conv_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authed';
  END IF;

  SELECT applicant_id, job_id, conversation_id
    INTO app_applicant, app_job, app_conv
  FROM anthem.job_applications
  WHERE id = p_application_id;

  IF app_applicant IS NULL THEN
    RAISE EXCEPTION 'application not found';
  END IF;

  SELECT posted_by, title INTO job_owner, job_title
  FROM anthem.job_posts
  WHERE id = app_job;

  IF job_owner IS NULL THEN
    RAISE EXCEPTION 'job not found';
  END IF;

  IF uid <> app_applicant AND uid <> job_owner AND NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF app_conv IS NOT NULL THEN
    RETURN app_conv;
  END IF;

  SELECT c.id INTO conv_id
  FROM shared.conversations c
  WHERE c.kind = 'hire'
    AND c.client_id = job_owner
    AND c.freelancer_id = app_applicant
    AND c.request_id IS NULL
    AND c.project_title = job_title
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO shared.conversations (
      kind, conversation_type, request_id, client_id, freelancer_id, project_title, created_by
    ) VALUES (
      'hire', 'direct', NULL, job_owner, app_applicant, job_title, uid
    )
    RETURNING id INTO conv_id;

    INSERT INTO shared.messages (conversation_id, sender_id, content, message_type)
    VALUES (
      conv_id,
      app_applicant,
      'สมัครงาน: ' || COALESCE(job_title, 'ตำแหน่งนี้') || E'\nส่งโปรไฟล์ให้บริษัทแล้ว คุยต่อในแชทหรือติดต่อนอกเว็บได้',
      'text'
    );
  END IF;

  UPDATE anthem.job_applications
  SET conversation_id = conv_id
  WHERE id = p_application_id
    AND conversation_id IS NULL;

  RETURN conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.open_job_application_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_job_application_chat(uuid) TO authenticated, service_role;
