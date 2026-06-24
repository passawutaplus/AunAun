
-- Enum for ad status
CREATE TYPE public.ad_status AS ENUM ('draft','pending','approved','active','paused','rejected','expired');
CREATE TYPE public.ad_package AS ENUM ('basic','standard','premium');
CREATE TYPE public.ad_application_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.ad_event_type AS ENUM ('impression','click');

-- =========================================
-- ad_campaigns
-- =========================================
CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_user_id uuid NOT NULL,
  title text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  target_url text NOT NULL,
  cta_label text NOT NULL DEFAULT 'เรียนรู้เพิ่มเติม',
  package public.ad_package NOT NULL DEFAULT 'basic',
  price_px integer NOT NULL DEFAULT 0,
  status public.ad_status NOT NULL DEFAULT 'pending',
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  rejection_reason text NOT NULL DEFAULT '',
  application_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ad_campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;

ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active ads viewable by everyone"
  ON public.ad_campaigns FOR SELECT
  USING (status = 'active' AND (end_at IS NULL OR end_at > now()) AND start_at <= now());

CREATE POLICY "Advertiser views own campaigns"
  ON public.ad_campaigns FOR SELECT
  TO authenticated
  USING (advertiser_user_id = auth.uid());

CREATE POLICY "Admins manage all campaigns"
  ON public.ad_campaigns FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ad_campaigns_updated
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ad_campaigns_status ON public.ad_campaigns(status);
CREATE INDEX idx_ad_campaigns_advertiser ON public.ad_campaigns(advertiser_user_id);

-- =========================================
-- ad_events
-- =========================================
CREATE TABLE public.ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  user_id uuid,
  event_type public.ad_event_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.ad_events TO anon, authenticated;
GRANT SELECT ON public.ad_events TO authenticated;
GRANT ALL ON public.ad_events TO service_role;

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone insert ad event"
  ON public.ad_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view ad events"
  ON public.ad_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ad_events_ad ON public.ad_events(ad_id);

-- =========================================
-- ad_applications
-- =========================================
CREATE TABLE public.ad_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  ad_title text NOT NULL,
  ad_tagline text NOT NULL DEFAULT '',
  ad_description text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  target_url text NOT NULL,
  cta_label text NOT NULL DEFAULT 'เรียนรู้เพิ่มเติม',
  package public.ad_package NOT NULL DEFAULT 'basic',
  duration_days integer NOT NULL DEFAULT 7,
  budget_px integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  status public.ad_application_status NOT NULL DEFAULT 'pending',
  admin_note text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.ad_applications TO authenticated;
GRANT ALL ON public.ad_applications TO service_role;

ALTER TABLE public.ad_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own applications"
  ON public.ad_applications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create own applications"
  ON public.ad_applications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins update applications"
  ON public.ad_applications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_ad_applications_updated
  BEFORE UPDATE ON public.ad_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- Functions
-- =========================================
CREATE OR REPLACE FUNCTION public.log_ad_event(_ad_id uuid, _event_type public.ad_event_type)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ad_events(ad_id, user_id, event_type)
    VALUES (_ad_id, auth.uid(), _event_type);
  IF _event_type = 'impression' THEN
    UPDATE public.ad_campaigns SET impressions = impressions + 1 WHERE id = _ad_id;
  ELSIF _event_type = 'click' THEN
    UPDATE public.ad_campaigns SET clicks = clicks + 1 WHERE id = _ad_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_active_ads(_limit integer DEFAULT 20)
RETURNS SETOF public.ad_campaigns
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.ad_campaigns
  WHERE status = 'active'
    AND start_at <= now()
    AND (end_at IS NULL OR end_at > now())
  ORDER BY random()
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_ad_application(_id uuid, _duration_days integer DEFAULT NULL)
RETURNS public.ad_campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app public.ad_applications;
  c public.ad_campaigns;
  dur integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO app FROM public.ad_applications WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;
  dur := COALESCE(_duration_days, app.duration_days, 7);

  INSERT INTO public.ad_campaigns(
    advertiser_user_id, title, tagline, image_url, target_url, cta_label,
    package, price_px, status, start_at, end_at, application_id
  ) VALUES (
    app.user_id, app.ad_title, app.ad_tagline, app.image_url, app.target_url, app.cta_label,
    app.package, app.budget_px, 'active', now(), now() + make_interval(days => dur), app.id
  ) RETURNING * INTO c;

  UPDATE public.ad_applications
    SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = _id;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.admin_reject_ad_application(_id uuid, _note text DEFAULT '')
RETURNS public.ad_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE app public.ad_applications;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.ad_applications
    SET status = 'rejected', admin_note = COALESCE(_note,''), reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = _id
    RETURNING * INTO app;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;
  RETURN app;
END $$;
