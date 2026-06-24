CREATE TABLE IF NOT EXISTS public.dashboard_daily_trends (
  trend_date DATE PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_daily_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read daily trends"
  ON public.dashboard_daily_trends
  FOR SELECT
  USING (true);
