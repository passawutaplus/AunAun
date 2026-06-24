
-- Track which features users open, for admin analytics.
CREATE TABLE public.feature_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_feature_usage_user ON public.feature_usage_events(user_id);
CREATE INDEX idx_feature_usage_feature ON public.feature_usage_events(feature);
CREATE INDEX idx_feature_usage_created ON public.feature_usage_events(created_at DESC);

ALTER TABLE public.feature_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own usage"
  ON public.feature_usage_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own usage"
  ON public.feature_usage_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all usage"
  ON public.feature_usage_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete usage"
  ON public.feature_usage_events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Aggregate function: ranks features by usage. Admin only.
CREATE OR REPLACE FUNCTION public.get_feature_usage_stats(_days integer DEFAULT 30)
RETURNS TABLE(
  feature text,
  total_events bigint,
  unique_users bigint,
  last_used timestamp with time zone
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    e.feature,
    COUNT(*)::bigint AS total_events,
    COUNT(DISTINCT e.user_id)::bigint AS unique_users,
    MAX(e.created_at) AS last_used
  FROM public.feature_usage_events e
  WHERE e.created_at >= now() - (_days || ' days')::interval
  GROUP BY e.feature
  ORDER BY total_events DESC;
END;
$$;
