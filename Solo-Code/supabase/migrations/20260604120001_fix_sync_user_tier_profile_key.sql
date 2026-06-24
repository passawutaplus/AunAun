-- profiles use user_id (auth uid), not profiles.id, for tier sync
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
  SELECT price_id, status, current_period_end, environment
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
    SELECT price_id, status, current_period_end, environment
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
    IF sub.price_id IN ('inhouse_monthly', 'inhouse_yearly') THEN
      new_tier := 'inhouse';
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
