
CREATE TABLE IF NOT EXISTS public.job_trackers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  share_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in-progress',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  payment_info TEXT NOT NULL DEFAULT '',
  final_file_url TEXT,
  preview_image_url TEXT,
  watermark_text TEXT NOT NULL DEFAULT 'PREVIEW',
  unlocked BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_trackers(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_slips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_trackers(id) ON DELETE CASCADE,
  slip_url TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  verified BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_slips ENABLE ROW LEVEL SECURITY;

-- job_trackers: owner full CRUD
CREATE POLICY "Owners select job_trackers" ON public.job_trackers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners insert job_trackers" ON public.job_trackers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update job_trackers" ON public.job_trackers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete job_trackers" ON public.job_trackers FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- public read by share_token (anyone with the link)
CREATE POLICY "Public can view job_trackers" ON public.job_trackers FOR SELECT TO anon, authenticated USING (true);

-- job_milestones: owner CRUD via parent
CREATE POLICY "Owners manage job_milestones" ON public.job_milestones FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_milestones.job_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_milestones.job_id AND j.user_id = auth.uid()));
CREATE POLICY "Public can view job_milestones" ON public.job_milestones FOR SELECT TO anon, authenticated USING (true);

-- job_slips: anyone can insert (client uploads via tracking link), owner can manage
CREATE POLICY "Public can insert job_slips" ON public.job_slips FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Owners manage job_slips" ON public.job_slips FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_slips.job_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_slips.job_id AND j.user_id = auth.uid()));
CREATE POLICY "Public can view job_slips" ON public.job_slips FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER trg_job_trackers_updated BEFORE UPDATE ON public.job_trackers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_job_trackers_user ON public.job_trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_job_trackers_token ON public.job_trackers(share_token);
CREATE INDEX IF NOT EXISTS idx_job_milestones_job ON public.job_milestones(job_id);
CREATE INDEX IF NOT EXISTS idx_job_slips_job ON public.job_slips(job_id);
