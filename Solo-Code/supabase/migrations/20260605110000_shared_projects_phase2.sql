-- Phase 2: Shared Squad schema (feature-gated in app until enabled)
CREATE TABLE IF NOT EXISTS public.shared_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  pricing_model text NOT NULL DEFAULT 'pay_per_project'
    CHECK (pricing_model IN ('pay_per_project', 'monthly_squad')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'closed')),
  tax_split_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  guest_token text UNIQUE,
  guest_visible_columns text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.shared_projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  role text NOT NULL DEFAULT 'collaborator'
    CHECK (role IN ('host', 'collaborator', 'guest')),
  revenue_percent numeric(5,2) NOT NULL DEFAULT 0,
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.shared_projects(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES public.project_members(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'doing', 'review', 'done')),
  sort_order int NOT NULL DEFAULT 0,
  handover_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_projects_host ON public.shared_projects(host_user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id);

ALTER TABLE public.shared_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_projects_host_select" ON public.shared_projects
  FOR SELECT USING (auth.uid() = host_user_id);

CREATE POLICY "shared_projects_host_insert" ON public.shared_projects
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "shared_projects_host_update" ON public.shared_projects
  FOR UPDATE USING (auth.uid() = host_user_id) WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "shared_projects_host_delete" ON public.shared_projects
  FOR DELETE USING (auth.uid() = host_user_id);

CREATE POLICY "project_members_host_all" ON public.project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
  );

CREATE POLICY "project_members_self_select" ON public.project_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "project_tasks_member_access" ON public.project_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_tasks.project_id AND pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_tasks.project_id AND pm.user_id = auth.uid()
    )
  );
