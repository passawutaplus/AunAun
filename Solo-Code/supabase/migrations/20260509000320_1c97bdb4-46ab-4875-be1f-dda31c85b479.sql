
CREATE TABLE IF NOT EXISTS public.price_guide_overrides (
  job_type text PRIMARY KEY,
  min_price numeric NOT NULL DEFAULT 0,
  max_price numeric NOT NULL DEFAULT 0,
  note text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_guide_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage overrides" ON public.price_guide_overrides
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read overrides" ON public.price_guide_overrides
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.price_guide_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid,
  user_id uuid NOT NULL,
  job_type text,
  rating text NOT NULL CHECK (rating IN ('up','down')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.price_guide_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own price feedback" ON public.price_guide_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own price feedback" ON public.price_guide_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all price feedback" ON public.price_guide_feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.price_guide_events
  ADD COLUMN IF NOT EXISTS reasoning text,
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;
