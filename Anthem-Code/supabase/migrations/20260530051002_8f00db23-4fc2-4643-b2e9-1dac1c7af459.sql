-- Columns for ad_applications: payment tracking
ALTER TABLE public.ad_applications
  ADD COLUMN IF NOT EXISTS amount_thb integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Columns for ad_campaigns: promotion text + payment ref
ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS promotion_text text NOT NULL DEFAULT '';

-- Columns for ad_events: richer analytics
ALTER TABLE public.ad_events
  ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'feed',
  ADD COLUMN IF NOT EXISTS session_id text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_ad_events_ad_created ON public.ad_events(ad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_type ON public.ad_events(event_type);

-- Mock payment RPC: marks an application as paid (prototype, no real Stripe)
CREATE OR REPLACE FUNCTION public.mock_pay_ad_application(_id uuid)
RETURNS public.ad_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  app public.ad_applications;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO app FROM public.ad_applications WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;
  IF app.user_id <> uid THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF app.status NOT IN ('pending_payment', 'pending') THEN
    RAISE EXCEPTION 'invalid status for payment';
  END IF;
  UPDATE public.ad_applications
    SET status = 'paid', paid_at = now(), updated_at = now()
    WHERE id = _id
    RETURNING * INTO app;
  RETURN app;
END $$;

REVOKE ALL ON FUNCTION public.mock_pay_ad_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mock_pay_ad_application(uuid) TO authenticated;

-- Per-day events for a campaign (last N days)
CREATE OR REPLACE FUNCTION public.ad_events_daily(_ad_id uuid, _days int DEFAULT 14)
RETURNS TABLE(day date, impressions bigint, clicks bigint, interests bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(
      (now() - make_interval(days => _days - 1))::date,
      now()::date,
      interval '1 day'
    )::date AS day
  )
  SELECT
    d.day,
    COALESCE(SUM(CASE WHEN e.event_type = 'impression' THEN 1 ELSE 0 END), 0)::bigint AS impressions,
    COALESCE(SUM(CASE WHEN e.event_type = 'click' THEN 1 ELSE 0 END), 0)::bigint AS clicks,
    COALESCE(SUM(CASE WHEN e.event_type = 'interest' THEN 1 ELSE 0 END), 0)::bigint AS interests
  FROM days d
  LEFT JOIN public.ad_events e
    ON e.ad_id = _ad_id
    AND e.created_at::date = d.day
  GROUP BY d.day
  ORDER BY d.day ASC;
$$;

GRANT EXECUTE ON FUNCTION public.ad_events_daily(uuid, int) TO authenticated, anon;

-- Admin: overall ad stats summary
CREATE OR REPLACE FUNCTION public.admin_ad_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT jsonb_build_object(
    'campaigns_total', (SELECT COUNT(*) FROM public.ad_campaigns),
    'campaigns_active', (SELECT COUNT(*) FROM public.ad_campaigns WHERE status='active'),
    'impressions_total', COALESCE((SELECT SUM(impressions) FROM public.ad_campaigns),0),
    'clicks_total', COALESCE((SELECT SUM(clicks) FROM public.ad_campaigns),0),
    'impressions_7d', (SELECT COUNT(*) FROM public.ad_events WHERE event_type='impression' AND created_at >= now() - interval '7 days'),
    'clicks_7d', (SELECT COUNT(*) FROM public.ad_events WHERE event_type='click' AND created_at >= now() - interval '7 days'),
    'unique_viewers_7d', (SELECT COUNT(DISTINCT COALESCE(user_id::text, session_id)) FROM public.ad_events WHERE event_type='impression' AND created_at >= now() - interval '7 days'),
    'applications_pending', (SELECT COUNT(*) FROM public.ad_applications WHERE status='pending'),
    'applications_pending_payment', (SELECT COUNT(*) FROM public.ad_applications WHERE status='pending_payment'),
    'applications_paid', (SELECT COUNT(*) FROM public.ad_applications WHERE status='paid'),
    'revenue_thb', COALESCE((SELECT SUM(amount_thb) FROM public.ad_applications WHERE status IN ('paid','approved')),0)
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.admin_ad_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ad_overview() TO authenticated;

-- Public RPC to fetch a single campaign for detail page (includes paused/expired if matches id)
-- Only returns active campaigns to keep prototype simple
CREATE OR REPLACE FUNCTION public.get_ad_campaign(_id uuid)
RETURNS public.ad_campaigns
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.ad_campaigns WHERE id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.get_ad_campaign(uuid) TO authenticated, anon;

-- Updated log_ad_event with placement + session_id
CREATE OR REPLACE FUNCTION public.log_ad_event_v2(
  _ad_id uuid,
  _event_type ad_event_type,
  _placement text DEFAULT 'feed',
  _session_id text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ad_events(ad_id, user_id, event_type, placement, session_id)
    VALUES (_ad_id, auth.uid(), _event_type, COALESCE(_placement,'feed'), COALESCE(_session_id,''));
  IF _event_type = 'impression' THEN
    UPDATE public.ad_campaigns SET impressions = impressions + 1 WHERE id = _ad_id;
  ELSIF _event_type = 'click' THEN
    UPDATE public.ad_campaigns SET clicks = clicks + 1 WHERE id = _ad_id;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.log_ad_event_v2(uuid, ad_event_type, text, text) TO authenticated, anon;
