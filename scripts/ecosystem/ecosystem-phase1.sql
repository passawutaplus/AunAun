-- Ecosystem Phase 1: tier seats, ecosystem_links, hire notifications
-- Run on unified Supabase project (rvnzjiskqliexysicfmh)

-- Seat quantity on active subscription (In-House checkout quantity)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS seat_quantity integer NOT NULL DEFAULT 1;

-- Cross-app link / conversion tracking
CREATE TABLE IF NOT EXISTS public.ecosystem_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  source_app text NOT NULL DEFAULT 'anthem',
  source_page text,
  ref_id text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ecosystem_links_user_created_idx
  ON public.ecosystem_links (user_id, created_at DESC);

ALTER TABLE public.ecosystem_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own ecosystem links" ON public.ecosystem_links;
CREATE POLICY "Users insert own ecosystem links"
  ON public.ecosystem_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own ecosystem links" ON public.ecosystem_links;
CREATE POLICY "Users read own ecosystem links"
  ON public.ecosystem_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages ecosystem links" ON public.ecosystem_links;
CREATE POLICY "Service role manages ecosystem links"
  ON public.ecosystem_links FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sync tier + seats from active subscription
CREATE OR REPLACE FUNCTION public.sync_user_tier(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tier text := 'free';
  new_seats integer := 1;
  sub record;
BEGIN
  SELECT price_id, status, current_period_end, environment, seat_quantity
    INTO sub
    FROM public.subscriptions
   WHERE user_id = _user_id
     AND environment = 'live'
     AND (
       (status IN ('active', 'trialing', 'past_due')
         AND (current_period_end IS NULL OR current_period_end > now()))
       OR (status = 'canceled' AND current_period_end > now())
     )
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    SELECT price_id, status, current_period_end, environment, seat_quantity
      INTO sub
      FROM public.subscriptions
     WHERE user_id = _user_id
       AND environment = 'sandbox'
       AND (
         (status IN ('active', 'trialing', 'past_due')
           AND (current_period_end IS NULL OR current_period_end > now()))
         OR (status = 'canceled' AND current_period_end > now())
       )
     ORDER BY created_at DESC
     LIMIT 1;
  END IF;

  IF FOUND THEN
    new_seats := GREATEST(1, COALESCE(sub.seat_quantity, 1));
    IF sub.price_id IN ('inhouse_monthly', 'inhouse_yearly') THEN
      new_tier := 'inhouse';
    ELSIF sub.price_id IN ('pro_plus_monthly', 'pro_plus_yearly') THEN
      new_tier := 'pro_plus';
    ELSE
      new_tier := 'pro';
    END IF;
  END IF;

  UPDATE public.profiles
     SET subscription_tier = new_tier,
         subscription_seats = new_seats
   WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_user_tier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_tier(uuid) TO service_role;

-- Optional portfolio video URLs (Anthem)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS video_urls text[] NOT NULL DEFAULT '{}';
