-- 1) Extend job_trackers
ALTER TABLE public.job_trackers
  ADD COLUMN IF NOT EXISTS tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.saved_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_percent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_paid BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS current_step INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deadline DATE;

-- Generate tracking_code for existing rows + default
CREATE OR REPLACE FUNCTION public.gen_tracking_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'JT' || to_char(now(), 'YYMMDD') || lpad(floor(random()*100000)::text, 5, '0');
  RETURN code;
END;
$$;

UPDATE public.job_trackers SET tracking_code = public.gen_tracking_code() WHERE tracking_code IS NULL;

ALTER TABLE public.job_trackers
  ALTER COLUMN tracking_code SET DEFAULT public.gen_tracking_code(),
  ALTER COLUMN tracking_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_trackers_tracking_code ON public.job_trackers(tracking_code);

-- 2) Timeline events table
CREATE TABLE IF NOT EXISTS public.job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_trackers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  amount NUMERIC,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage job_events" ON public.job_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_events.job_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.job_trackers j WHERE j.id = job_events.job_id AND j.user_id = auth.uid()));
CREATE POLICY "Public can view job_events" ON public.job_events FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_job_events_job ON public.job_events(job_id, created_at DESC);