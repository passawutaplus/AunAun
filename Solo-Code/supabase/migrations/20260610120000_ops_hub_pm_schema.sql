-- Ops Hub PM workspace: native issues, cycles, roadmap

CREATE SCHEMA IF NOT EXISTS ops;

GRANT USAGE ON SCHEMA ops TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA ops GRANT ALL ON FUNCTIONS TO service_role;

CREATE TABLE ops.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  app_scope text NOT NULL DEFAULT 'ecosystem'
    CHECK (app_scope IN ('ecosystem', 'so1o', 'an1hem')),
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ops.cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS ops.issue_number_seq START 1;

CREATE OR REPLACE FUNCTION ops.format_issue_number(n bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'OPS-' || lpad(n::text, 4, '0');
$$;

CREATE TABLE ops.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number text NOT NULL UNIQUE,
  project_id uuid REFERENCES ops.projects(id) ON DELETE SET NULL,
  cycle_id uuid REFERENCES ops.cycles(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text,
  status text NOT NULL DEFAULT 'backlog'
    CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  assignee_id uuid,
  labels text[] NOT NULL DEFAULT '{}',
  source_type text,
  source_id uuid,
  due_date date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ops.issue_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES ops.issues(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ops.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  project_id uuid REFERENCES ops.projects(id) ON DELETE SET NULL,
  quarter text NOT NULL,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('idea', 'planned', 'in_progress', 'shipped')),
  issue_id uuid REFERENCES ops.issues(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ops_issues_status ON ops.issues(status, updated_at DESC);
CREATE INDEX idx_ops_issues_cycle ON ops.issues(cycle_id) WHERE cycle_id IS NOT NULL;
CREATE INDEX idx_ops_issues_source ON ops.issues(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_ops_roadmap_quarter ON ops.roadmap_items(quarter);

CREATE OR REPLACE FUNCTION ops.assign_issue_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.issue_number IS NULL OR NEW.issue_number = '' THEN
    NEW.issue_number := ops.format_issue_number(nextval('ops.issue_number_seq'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ops_issues_number
  BEFORE INSERT ON ops.issues
  FOR EACH ROW EXECUTE FUNCTION ops.assign_issue_number();

CREATE OR REPLACE FUNCTION ops.touch_issues_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ops_issues_updated
  BEFORE UPDATE ON ops.issues
  FOR EACH ROW EXECUTE FUNCTION ops.touch_issues_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ops TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA ops TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO authenticated;

ALTER TABLE ops.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ops projects"
  ON ops.projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ops cycles"
  ON ops.cycles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ops issues"
  ON ops.issues FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ops issue comments"
  ON ops.issue_comments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage ops roadmap"
  ON ops.roadmap_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed
INSERT INTO ops.projects (name, slug, app_scope, color) VALUES
  ('Ecosystem', 'ecosystem', 'ecosystem', '#1a1a1a'),
  ('So1o Platform', 'so1o', 'so1o', '#e8740c'),
  ('an1hem', 'an1hem', 'an1hem', '#e85d24')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO ops.cycles (name, start_date, end_date, status)
SELECT 'Cycle 1 — Jun 2026', '2026-06-01'::date, '2026-06-30'::date, 'active'
WHERE NOT EXISTS (SELECT 1 FROM ops.cycles WHERE name = 'Cycle 1 — Jun 2026');

INSERT INTO ops.roadmap_items (title, description, project_id, quarter, status)
SELECT
  'Ops Hub PM Workspace',
  'Inbox, Board, Cycles, Roadmap สำหรับ PM',
  p.id,
  '2026-Q2',
  'in_progress'
FROM ops.projects p
WHERE p.slug = 'ecosystem'
  AND NOT EXISTS (
    SELECT 1 FROM ops.roadmap_items r WHERE r.title = 'Ops Hub PM Workspace'
  );

-- Promote external work item → ops issue (callable from Hub client)
CREATE OR REPLACE FUNCTION public.ops_promote_work_item(
  p_source_type text,
  p_source_id uuid,
  p_title text,
  p_description text DEFAULT NULL
)
RETURNS ops.issues
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ops
AS $$
DECLARE
  uid uuid := auth.uid();
  proj_id uuid;
  existing ops.issues;
  created ops.issues;
BEGIN
  IF NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO existing FROM ops.issues
  WHERE source_type = p_source_type AND source_id = p_source_id
  LIMIT 1;

  IF existing.id IS NOT NULL THEN
    RETURN existing;
  END IF;

  SELECT id INTO proj_id FROM ops.projects
  WHERE slug = CASE
    WHEN p_source_type IN ('app_feedback', 'user_report') THEN 'an1hem'
    WHEN p_source_type IN ('support_ticket', 'feature_suggestion') THEN 'so1o'
    ELSE 'ecosystem'
  END
  LIMIT 1;

  INSERT INTO ops.issues (
    title, description, project_id, status, priority,
    source_type, source_id, created_by
  ) VALUES (
    p_title,
    p_description,
    proj_id,
    'backlog',
    'medium',
    p_source_type,
    p_source_id,
    uid
  )
  RETURNING * INTO created;

  RETURN created;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ops_promote_work_item(text, uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.ops_promote_work_item(text, uuid, text, text) FROM PUBLIC, anon;
