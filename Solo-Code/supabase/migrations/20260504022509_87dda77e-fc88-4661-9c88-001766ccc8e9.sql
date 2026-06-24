-- Calculator usage tracking
CREATE TABLE IF NOT EXISTS public.calculator_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calculator_usage_created_at
  ON public.calculator_usage_events (created_at DESC);

ALTER TABLE public.calculator_usage_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can record a usage event
CREATE POLICY "Anyone can log calculator usage"
  ON public.calculator_usage_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can read aggregate (we only expose count via RPC, but allow select for realtime subscription payloads)
CREATE POLICY "Anyone can view calculator usage"
  ON public.calculator_usage_events
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.calculator_usage_events;

-- RPC for fast count
CREATE OR REPLACE FUNCTION public.get_calculator_usage_count()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.calculator_usage_events;
$$;

GRANT EXECUTE ON FUNCTION public.get_calculator_usage_count() TO anon, authenticated;