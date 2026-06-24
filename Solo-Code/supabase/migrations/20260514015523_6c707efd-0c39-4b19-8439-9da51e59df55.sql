
CREATE TABLE public.dashboard_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand TEXT NOT NULL DEFAULT '',
  task TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.dashboard_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own dashboard_jobs select" ON public.dashboard_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own dashboard_jobs insert" ON public.dashboard_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own dashboard_jobs update" ON public.dashboard_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own dashboard_jobs delete" ON public.dashboard_jobs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own dashboard_tasks select" ON public.dashboard_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own dashboard_tasks insert" ON public.dashboard_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own dashboard_tasks update" ON public.dashboard_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own dashboard_tasks delete" ON public.dashboard_tasks FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_dashboard_jobs_updated_at BEFORE UPDATE ON public.dashboard_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dashboard_tasks_updated_at BEFORE UPDATE ON public.dashboard_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dashboard_jobs_user ON public.dashboard_jobs(user_id, sort_order);
CREATE INDEX idx_dashboard_tasks_user ON public.dashboard_tasks(user_id, sort_order);

ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_tasks;
