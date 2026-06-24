-- Sub-tasks table for grouped job list
CREATE TABLE IF NOT EXISTS public.dashboard_job_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.dashboard_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_job_tasks_job_id ON public.dashboard_job_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_job_tasks_user_id ON public.dashboard_job_tasks(user_id);

ALTER TABLE public.dashboard_job_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own job tasks" ON public.dashboard_job_tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own job tasks" ON public.dashboard_job_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own job tasks" ON public.dashboard_job_tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own job tasks" ON public.dashboard_job_tasks
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_dashboard_job_tasks_updated_at
  BEFORE UPDATE ON public.dashboard_job_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_job_tasks;

-- Scratchpad notes table (single row per user)
CREATE TABLE IF NOT EXISTS public.dashboard_notes (
  user_id UUID PRIMARY KEY,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notes" ON public.dashboard_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notes" ON public.dashboard_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notes" ON public.dashboard_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notes" ON public.dashboard_notes
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_dashboard_notes_updated_at
  BEFORE UPDATE ON public.dashboard_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();