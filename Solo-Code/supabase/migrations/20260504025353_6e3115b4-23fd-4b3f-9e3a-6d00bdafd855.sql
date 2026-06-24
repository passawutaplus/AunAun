
-- 1. Device events table
CREATE TABLE IF NOT EXISTS public.user_device_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  device_type text NOT NULL CHECK (device_type IN ('mobile','tablet','desktop')),
  os text,
  browser text,
  viewport_width integer,
  viewport_height integer,
  pixel_ratio numeric,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_events_created_at ON public.user_device_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_events_device_type ON public.user_device_events(device_type);
CREATE INDEX IF NOT EXISTS idx_device_events_user_id ON public.user_device_events(user_id);

ALTER TABLE public.user_device_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log device event"
  ON public.user_device_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins view device events"
  ON public.user_device_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Device usage stats RPC
CREATE OR REPLACE FUNCTION public.get_device_usage_stats(_days integer DEFAULT 30)
RETURNS TABLE(
  device_type text,
  sessions bigint,
  unique_users bigint,
  pct numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_sessions bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  SELECT COUNT(*) INTO total_sessions
  FROM public.user_device_events
  WHERE created_at >= now() - (_days || ' days')::interval;

  RETURN QUERY
  SELECT
    e.device_type,
    COUNT(*)::bigint AS sessions,
    COUNT(DISTINCT COALESCE(e.user_id::text, e.session_id))::bigint AS unique_users,
    CASE WHEN total_sessions > 0
      THEN ROUND((COUNT(*)::numeric / total_sessions) * 100, 1)
      ELSE 0 END AS pct
  FROM public.user_device_events e
  WHERE e.created_at >= now() - (_days || ' days')::interval
  GROUP BY e.device_type
  ORDER BY sessions DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_device_breakdown(_days integer DEFAULT 30, _by text DEFAULT 'os')
RETURNS TABLE(
  label text,
  sessions bigint,
  unique_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF _by = 'browser' THEN
    RETURN QUERY
    SELECT COALESCE(e.browser, 'unknown'),
           COUNT(*)::bigint,
           COUNT(DISTINCT COALESCE(e.user_id::text, e.session_id))::bigint
    FROM public.user_device_events e
    WHERE e.created_at >= now() - (_days || ' days')::interval
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10;
  ELSE
    RETURN QUERY
    SELECT COALESCE(e.os, 'unknown'),
           COUNT(*)::bigint,
           COUNT(DISTINCT COALESCE(e.user_id::text, e.session_id))::bigint
    FROM public.user_device_events e
    WHERE e.created_at >= now() - (_days || ' days')::interval
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 10;
  END IF;
END;
$$;

-- 3. Grant EXECUTE on stats RPCs to authenticated role (function bodies still enforce admin check)
GRANT EXECUTE ON FUNCTION public.get_top_subscriptions(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_active_users(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hourly_active_distribution(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_active_users(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_db_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_usage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_data_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_usage_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_usage_trend(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_usage_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_breakdown(integer, text) TO authenticated;

-- Also wrap get_top_subscriptions with admin guard so non-admins get a clear error rather than empty rows
CREATE OR REPLACE FUNCTION public.get_top_subscriptions(_limit integer DEFAULT 50)
RETURNS TABLE(
  name text,
  category text,
  user_count bigint,
  total_subscriptions bigint,
  avg_price numeric,
  total_monthly_value numeric
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
    initcap(btrim(lower(s.name)))::text AS name,
    (array_agg(s.category ORDER BY s.created_at DESC) FILTER (WHERE s.category IS NOT NULL))[1] AS category,
    COUNT(DISTINCT s.user_id)::bigint AS user_count,
    COUNT(*)::bigint AS total_subscriptions,
    ROUND(AVG(s.price)::numeric, 2) AS avg_price,
    ROUND(SUM(
      CASE
        WHEN s.cycle = 'yearly' THEN s.price / 12.0
        WHEN s.cycle = 'weekly' THEN s.price * 4.33
        WHEN s.cycle = 'one-time' THEN 0
        ELSE s.price
      END
    )::numeric, 2) AS total_monthly_value
  FROM public.finance_subscriptions s
  WHERE s.is_active = true
  GROUP BY initcap(btrim(lower(s.name)))
  ORDER BY user_count DESC, total_subscriptions DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_subscriptions(integer) TO authenticated;
