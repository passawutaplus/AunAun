-- Persistent storage for Planner, Feedback, Projects, Assets, Review pins
-- Additive only — no DROP / TRUNCATE / DELETE on existing tables

-- 1. planner_posts
CREATE TABLE IF NOT EXISTS public.planner_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  post_date DATE NOT NULL,
  post_time TEXT NOT NULL DEFAULT '10:00',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  link TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.planner_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_planner_posts_user ON public.planner_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_posts_user_date ON public.planner_posts(user_id, post_date);

DROP POLICY IF EXISTS "Owners select planner_posts" ON public.planner_posts;
DROP POLICY IF EXISTS "Owners insert planner_posts" ON public.planner_posts;
DROP POLICY IF EXISTS "Owners update planner_posts" ON public.planner_posts;
DROP POLICY IF EXISTS "Owners delete planner_posts" ON public.planner_posts;
CREATE POLICY "Owners select planner_posts" ON public.planner_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert planner_posts" ON public.planner_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update planner_posts" ON public.planner_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete planner_posts" ON public.planner_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_planner_posts_updated ON public.planner_posts;
CREATE TRIGGER trg_planner_posts_updated BEFORE UPDATE ON public.planner_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. feedback_jobs
CREATE TABLE IF NOT EXISTS public.feedback_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT false,
  revisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_feedback_jobs_user ON public.feedback_jobs(user_id);

DROP POLICY IF EXISTS "Owners select feedback_jobs" ON public.feedback_jobs;
DROP POLICY IF EXISTS "Owners insert feedback_jobs" ON public.feedback_jobs;
DROP POLICY IF EXISTS "Owners update feedback_jobs" ON public.feedback_jobs;
DROP POLICY IF EXISTS "Owners delete feedback_jobs" ON public.feedback_jobs;
CREATE POLICY "Owners select feedback_jobs" ON public.feedback_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert feedback_jobs" ON public.feedback_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update feedback_jobs" ON public.feedback_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete feedback_jobs" ON public.feedback_jobs FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_feedback_jobs_updated ON public.feedback_jobs;
CREATE TRIGGER trg_feedback_jobs_updated BEFORE UPDATE ON public.feedback_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. work_projects (To Do / Kanban)
CREATE TABLE IF NOT EXISTS public.work_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '—',
  client_id TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'medium',
  versions JSONB NOT NULL DEFAULT '[]'::jsonb,
  comments JSONB NOT NULL DEFAULT '[]'::jsonb,
  revisions INTEGER NOT NULL DEFAULT 0,
  revision_limit INTEGER NOT NULL DEFAULT 2,
  done_at DATE,
  archived BOOLEAN NOT NULL DEFAULT false,
  rate NUMERIC,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.work_projects ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_work_projects_user ON public.work_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_work_projects_user_status ON public.work_projects(user_id, status);

DROP POLICY IF EXISTS "Owners select work_projects" ON public.work_projects;
DROP POLICY IF EXISTS "Owners insert work_projects" ON public.work_projects;
DROP POLICY IF EXISTS "Owners update work_projects" ON public.work_projects;
DROP POLICY IF EXISTS "Owners delete work_projects" ON public.work_projects;
CREATE POLICY "Owners select work_projects" ON public.work_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert work_projects" ON public.work_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update work_projects" ON public.work_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete work_projects" ON public.work_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_work_projects_updated ON public.work_projects;
CREATE TRIGGER trg_work_projects_updated BEFORE UPDATE ON public.work_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. asset_items (font / brand / link / snippet)
CREATE TABLE IF NOT EXISTS public.asset_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('font','brand','link','snippet')),
  label TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.asset_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_asset_items_user ON public.asset_items(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_items_user_kind ON public.asset_items(user_id, kind);

DROP POLICY IF EXISTS "Owners select asset_items" ON public.asset_items;
DROP POLICY IF EXISTS "Owners insert asset_items" ON public.asset_items;
DROP POLICY IF EXISTS "Owners update asset_items" ON public.asset_items;
DROP POLICY IF EXISTS "Owners delete asset_items" ON public.asset_items;
CREATE POLICY "Owners select asset_items" ON public.asset_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert asset_items" ON public.asset_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update asset_items" ON public.asset_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete asset_items" ON public.asset_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_asset_items_updated ON public.asset_items;
CREATE TRIGGER trg_asset_items_updated BEFORE UPDATE ON public.asset_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. review_pins
CREATE TABLE IF NOT EXISTS public.review_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  board TEXT NOT NULL DEFAULT 'default',
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.review_pins ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_review_pins_user ON public.review_pins(user_id);

DROP POLICY IF EXISTS "Owners select review_pins" ON public.review_pins;
DROP POLICY IF EXISTS "Owners insert review_pins" ON public.review_pins;
DROP POLICY IF EXISTS "Owners update review_pins" ON public.review_pins;
DROP POLICY IF EXISTS "Owners delete review_pins" ON public.review_pins;
CREATE POLICY "Owners select review_pins" ON public.review_pins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert review_pins" ON public.review_pins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update review_pins" ON public.review_pins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete review_pins" ON public.review_pins FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_review_pins_updated ON public.review_pins;
CREATE TRIGGER trg_review_pins_updated BEFORE UPDATE ON public.review_pins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();