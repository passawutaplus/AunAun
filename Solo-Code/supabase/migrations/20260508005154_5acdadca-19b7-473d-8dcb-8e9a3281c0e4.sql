
CREATE TABLE public.price_guide_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  job_type text NOT NULL,
  days integer NOT NULL DEFAULT 1,
  complexity text NOT NULL DEFAULT 'normal',
  recommended_price numeric NOT NULL DEFAULT 0,
  min_price numeric NOT NULL DEFAULT 0,
  max_price numeric NOT NULL DEFAULT 0,
  applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_guide_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own price guide events"
  ON public.price_guide_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all price guide events"
  ON public.price_guide_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own price guide events"
  ON public.price_guide_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_price_guide_events_job_type ON public.price_guide_events(job_type);
CREATE INDEX idx_price_guide_events_user ON public.price_guide_events(user_id);
