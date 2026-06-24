-- Free tier: 5 AI credits per day for the first 15 days after signup (Bangkok calendar).

ALTER TABLE public.ai_tier_config DROP CONSTRAINT IF EXISTS ai_tier_config_monthly_included_check;
ALTER TABLE public.ai_tier_config ADD CONSTRAINT ai_tier_config_monthly_included_check CHECK (monthly_included >= 0);

ALTER TABLE public.user_ai_period DROP CONSTRAINT IF EXISTS user_ai_period_included_limit_check;
ALTER TABLE public.user_ai_period ADD CONSTRAINT user_ai_period_included_limit_check CHECK (included_limit >= 0);

UPDATE public.ai_tier_config SET monthly_included = 0, updated_at = now() WHERE tier = 'free';

CREATE OR REPLACE FUNCTION public._ai_free_trial_days_left(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup timestamptz;
  v_days integer;
BEGIN
  SELECT created_at INTO v_signup FROM public.profiles WHERE user_id = _user_id;
  IF v_signup IS NULL THEN
    SELECT created_at INTO v_signup FROM auth.users WHERE id = _user_id;
  END IF;
  IF v_signup IS NULL THEN RETURN 0; END IF;

  v_days := ((now() AT TIME ZONE 'Asia/Bangkok')::date - (v_signup AT TIME ZONE 'Asia/Bangkok')::date);
  RETURN GREATEST(0, 15 - v_days);
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_resolve_period(_user_id uuid)
RETURNS TABLE(period_key text, period_end timestamptz, included_limit integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_limit integer;
  v_sub record;
  v_month text;
  v_today date;
  v_trial_days_left integer;
BEGIN
  v_tier := public._ai_user_tier(_user_id);
  SELECT monthly_included INTO v_limit FROM public.ai_tier_config WHERE tier = v_tier;
  IF v_limit IS NULL THEN v_limit := 0; END IF;

  IF v_tier IN ('pro', 'inhouse') THEN
    SELECT s.current_period_end, s.current_period_start
      INTO v_sub
      FROM public.subscriptions s
     WHERE s.user_id = _user_id
       AND s.status IN ('active', 'trialing', 'past_due')
       AND (s.current_period_end IS NULL OR s.current_period_end > now())
     ORDER BY s.created_at DESC
     LIMIT 1;

    IF FOUND AND v_sub.current_period_end IS NOT NULL THEN
      period_key := 'sub:' || to_char(v_sub.current_period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD');
      period_end := v_sub.current_period_end;
      included_limit := v_limit;
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  IF v_tier = 'free' THEN
    v_trial_days_left := public._ai_free_trial_days_left(_user_id);
    v_today := (now() AT TIME ZONE 'Asia/Bangkok')::date;

    IF v_trial_days_left > 0 THEN
      period_key := 'free-day:' || to_char(v_today, 'YYYY-MM-DD');
      period_end := (v_today + 1)::timestamp AT TIME ZONE 'Asia/Bangkok';
      included_limit := 5;
      RETURN NEXT;
      RETURN;
    END IF;

    period_key := 'free-expired:' || to_char(v_today, 'YYYY-MM');
    period_end := (
      (date_trunc('month', (now() AT TIME ZONE 'Asia/Bangkok')::timestamp) + interval '1 month')
      AT TIME ZONE 'Asia/Bangkok'
    );
    included_limit := 0;
    RETURN NEXT;
    RETURN;
  END IF;

  v_month := to_char((now() AT TIME ZONE 'Asia/Bangkok')::date, 'YYYY-MM');
  period_key := 'cal:' || v_month;
  period_end := (
    (date_trunc('month', (now() AT TIME ZONE 'Asia/Bangkok')::timestamp) + interval '1 month')
    AT TIME ZONE 'Asia/Bangkok'
  );
  included_limit := v_limit;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(
  _user_id uuid,
  _environment text DEFAULT 'sandbox'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period record;
  v_included_used integer := 0;
  v_included_limit integer;
  v_purchased integer := 0;
  v_tier text;
  v_trial_days_left integer := 0;
  v_period_type text := 'monthly';
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  v_tier := public._ai_user_tier(_user_id);
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);

  IF v_tier = 'free' THEN
    v_trial_days_left := public._ai_free_trial_days_left(_user_id);
    IF v_trial_days_left > 0 THEN
      v_period_type := 'free_daily_trial';
    ELSIF v_period.period_key LIKE 'free-expired:%' THEN
      v_period_type := 'free_trial_ended';
    END IF;
  ELSIF v_period.period_key LIKE 'sub:%' THEN
    v_period_type := 'subscription';
  END IF;

  SELECT included_used, included_limit
    INTO v_included_used, v_included_limit
    FROM public.user_ai_period
   WHERE user_id = _user_id AND period_key = v_period.period_key;

  v_included_used := COALESCE(v_included_used, 0);
  v_included_limit := COALESCE(v_included_limit, v_period.included_limit);

  SELECT balance INTO v_purchased
    FROM public.user_credits
   WHERE user_id = _user_id AND environment = _environment;

  v_purchased := COALESCE(v_purchased, 0);

  RETURN jsonb_build_object(
    'tier', v_tier,
    'period_key', v_period.period_key,
    'period_end', v_period.period_end,
    'period_type', v_period_type,
    'free_trial_days_left', v_trial_days_left,
    'daily_limit', CASE WHEN v_period_type = 'free_daily_trial' THEN 5 ELSE NULL END,
    'included_used', v_included_used,
    'included_limit', v_included_limit,
    'included_remaining', GREATEST(0, v_included_limit - v_included_used),
    'purchased_balance', v_purchased,
    'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased
  );
END;
$$;
