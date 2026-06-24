
-- Activity Logs table
CREATE TABLE public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'page_view',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ual_user_created ON public.user_activity_logs (user_id, created_at DESC);
CREATE INDEX idx_ual_created ON public.user_activity_logs (created_at DESC);

ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own activity"
  ON public.user_activity_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all activity"
  ON public.user_activity_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete activity"
  ON public.user_activity_logs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RPC: log activity with 1-hour throttle per user+type
CREATE OR REPLACE FUNCTION public.log_user_activity(_activity_type TEXT DEFAULT 'page_view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _exists BOOLEAN;
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_activity_logs
    WHERE user_id = _uid
      AND activity_type = _activity_type
      AND created_at > now() - INTERVAL '1 hour'
  ) INTO _exists;

  IF _exists THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_activity_logs (user_id, activity_type)
  VALUES (_uid, _activity_type);

  RETURN true;
END;
$$;

-- Admin analytics: daily active users for last N days
CREATE OR REPLACE FUNCTION public.get_daily_active_users(_days INTEGER DEFAULT 30)
RETURNS TABLE(day DATE, active_users BIGINT, total_events BIGINT)
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
    (l.created_at AT TIME ZONE 'Asia/Bangkok')::date AS day,
    COUNT(DISTINCT l.user_id)::bigint AS active_users,
    COUNT(*)::bigint AS total_events
  FROM public.user_activity_logs l
  WHERE l.created_at >= now() - (_days || ' days')::interval
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

-- Admin analytics: hourly distribution (0-23) over last N days
CREATE OR REPLACE FUNCTION public.get_hourly_active_distribution(_days INTEGER DEFAULT 30)
RETURNS TABLE(hour INTEGER, events BIGINT, unique_users BIGINT)
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
    EXTRACT(HOUR FROM (l.created_at AT TIME ZONE 'Asia/Bangkok'))::int AS hour,
    COUNT(*)::bigint AS events,
    COUNT(DISTINCT l.user_id)::bigint AS unique_users
  FROM public.user_activity_logs l
  WHERE l.created_at >= now() - (_days || ' days')::interval
  GROUP BY 1
  ORDER BY 1 ASC;
END;
$$;

-- Admin analytics: top active users in last N days (count of distinct days)
CREATE OR REPLACE FUNCTION public.get_top_active_users(_days INTEGER DEFAULT 7, _limit INTEGER DEFAULT 20)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  email TEXT,
  active_days BIGINT,
  total_events BIGINT,
  last_seen TIMESTAMP WITH TIME ZONE
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
    l.user_id,
    p.display_name,
    p.email,
    COUNT(DISTINCT (l.created_at AT TIME ZONE 'Asia/Bangkok')::date)::bigint AS active_days,
    COUNT(*)::bigint AS total_events,
    MAX(l.created_at) AS last_seen
  FROM public.user_activity_logs l
  LEFT JOIN public.profiles p ON p.user_id = l.user_id
  WHERE l.created_at >= now() - (_days || ' days')::interval
  GROUP BY l.user_id, p.display_name, p.email
  ORDER BY active_days DESC, total_events DESC
  LIMIT LEAST(GREATEST(_limit, 1), 200);
END;
$$;

-- Cron: weekly cleanup of logs older than 60 days
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-activity-logs-weekly') THEN
    PERFORM cron.unschedule('purge-activity-logs-weekly');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-activity-logs-weekly',
  '15 3 * * 0',
  $$ DELETE FROM public.user_activity_logs WHERE created_at < now() - INTERVAL '60 days'; $$
);
