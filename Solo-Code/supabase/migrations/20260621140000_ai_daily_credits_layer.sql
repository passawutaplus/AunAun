-- Credit AI daily layer: 5 credits/day (non-stacking) on top of pack/purchased pool.
-- Free: 5/day for first 14 days after signup. Pro+: 5/day always.
-- Grandfather: existing free-starter rows (25 one-time) remain as pack pool.

ALTER TABLE public.ai_credit_ledger DROP CONSTRAINT IF EXISTS ai_credit_ledger_source_check;
ALTER TABLE public.ai_credit_ledger ADD CONSTRAINT ai_credit_ledger_source_check
  CHECK (source IN ('daily', 'included', 'purchased', 'mixed', 'refund'));

CREATE OR REPLACE FUNCTION public._ai_signup_at(_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_signup timestamptz;
BEGIN
  SELECT created_at INTO v_signup FROM public.profiles WHERE user_id = _user_id;
  IF v_signup IS NULL THEN SELECT created_at INTO v_signup FROM auth.users WHERE id = _user_id; END IF;
  RETURN v_signup;
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_free_daily_trial_days_left(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_signup timestamptz; v_days integer;
BEGIN
  v_signup := public._ai_signup_at(_user_id);
  IF v_signup IS NULL THEN RETURN 0; END IF;
  v_days := ((now() AT TIME ZONE 'Asia/Bangkok')::date - (v_signup AT TIME ZONE 'Asia/Bangkok')::date);
  RETURN GREATEST(0, 14 - v_days);
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_free_trial_ends_at(_user_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_signup timestamptz;
BEGIN
  v_signup := public._ai_signup_at(_user_id);
  IF v_signup IS NULL THEN RETURN NULL; END IF;
  RETURN ((v_signup AT TIME ZONE 'Asia/Bangkok')::date + 14)::timestamp AT TIME ZONE 'Asia/Bangkok';
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_daily_limit(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_tier text;
BEGIN
  v_tier := public._ai_user_tier(_user_id);
  IF v_tier IN ('pro', 'pro_plus', 'inhouse') THEN RETURN 5; END IF;
  IF v_tier = 'free' AND public._ai_free_daily_trial_days_left(_user_id) > 0 THEN RETURN 5; END IF;
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_daily_period_key()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'daily:' || to_char((now() AT TIME ZONE 'Asia/Bangkok')::date, 'YYYY-MM-DD');
$$;

CREATE OR REPLACE FUNCTION public._ai_daily_period_end()
RETURNS timestamptz LANGUAGE sql STABLE AS $$
  SELECT ((now() AT TIME ZONE 'Asia/Bangkok')::date + 1)::timestamp AT TIME ZONE 'Asia/Bangkok';
$$;

CREATE OR REPLACE FUNCTION public._ai_sync_daily_period(_user_id uuid)
RETURNS TABLE(daily_limit integer, daily_used integer, daily_remaining integer, daily_period_key text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_key text; v_limit integer; v_used integer;
BEGIN
  v_limit := public._ai_daily_limit(_user_id);
  v_key := public._ai_daily_period_key();
  IF v_limit <= 0 THEN
    daily_limit := 0; daily_used := 0; daily_remaining := 0; daily_period_key := v_key;
    RETURN NEXT; RETURN;
  END IF;
  INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
  VALUES (_user_id, v_key, v_limit, 0, public._ai_daily_period_end())
  ON CONFLICT (user_id, period_key) DO NOTHING;
  SELECT included_limit, included_used INTO v_limit, v_used
    FROM public.user_ai_period WHERE user_id = _user_id AND period_key = v_key;
  daily_limit := COALESCE(v_limit, 0);
  daily_used := COALESCE(v_used, 0);
  daily_remaining := GREATEST(0, daily_limit - daily_used);
  daily_period_key := v_key;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public._ai_resolve_period(_user_id uuid)
RETURNS TABLE(period_key text, period_end timestamptz, included_limit integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_tier text; v_limit integer; v_sub record; v_month text;
BEGIN
  v_tier := public._ai_user_tier(_user_id);
  SELECT monthly_included INTO v_limit FROM public.ai_tier_config WHERE tier = v_tier;
  IF v_limit IS NULL THEN v_limit := 0; END IF;

  IF v_tier IN ('pro', 'pro_plus', 'inhouse') THEN
    SELECT s.current_period_end, s.current_period_start INTO v_sub
      FROM public.subscriptions s
     WHERE s.user_id = _user_id
       AND s.status IN ('active', 'trialing', 'past_due')
       AND (s.current_period_end IS NULL OR s.current_period_end > now())
     ORDER BY s.created_at DESC LIMIT 1;
    IF FOUND AND v_sub.current_period_end IS NOT NULL THEN
      period_key := 'sub:' || to_char(v_sub.current_period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD');
      period_end := v_sub.current_period_end;
      included_limit := v_limit;
      RETURN NEXT; RETURN;
    END IF;
  END IF;

  IF v_tier = 'free' THEN
    IF EXISTS (SELECT 1 FROM public.user_ai_period WHERE user_id = _user_id AND period_key = 'free-starter') THEN
      period_key := 'free-starter'; period_end := NULL; included_limit := GREATEST(v_limit, 25);
      RETURN NEXT; RETURN;
    END IF;
    IF public._ai_free_daily_trial_days_left(_user_id) > 0 THEN
      period_key := 'free-trial'; period_end := public._ai_free_trial_ends_at(_user_id); included_limit := 0;
      RETURN NEXT; RETURN;
    END IF;
    period_key := 'free-ended'; period_end := NULL; included_limit := 0;
    RETURN NEXT; RETURN;
  END IF;

  v_month := to_char((now() AT TIME ZONE 'Asia/Bangkok')::date, 'YYYY-MM');
  period_key := 'cal:' || v_month;
  period_end := ((date_trunc('month', (now() AT TIME ZONE 'Asia/Bangkok')::timestamp) + interval '1 month') AT TIME ZONE 'Asia/Bangkok');
  included_limit := v_limit;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(_user_id uuid, _environment text DEFAULT 'sandbox')
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_period record; v_daily record;
  v_included_used integer := 0; v_included_limit integer; v_purchased integer := 0;
  v_tier text; v_period_type text := 'monthly';
  v_pool_remaining integer; v_total_remaining integer;
  v_trial_days_left integer := 0; v_free_trial_ends timestamptz;
BEGIN
  IF _user_id IS NULL THEN RETURN jsonb_build_object('error', 'unauthenticated'); END IF;
  v_tier := public._ai_user_tier(_user_id);
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  SELECT * INTO v_daily FROM public._ai_sync_daily_period(_user_id);
  SELECT included_used, included_limit INTO v_included_used, v_included_limit
    FROM public.user_ai_period WHERE user_id = _user_id AND period_key = v_period.period_key;
  v_included_used := COALESCE(v_included_used, 0);
  v_included_limit := COALESCE(v_included_limit, v_period.included_limit);
  SELECT balance INTO v_purchased FROM public.user_credits WHERE user_id = _user_id AND environment = _environment;
  v_purchased := COALESCE(v_purchased, 0);
  v_pool_remaining := GREATEST(0, v_included_limit - v_included_used);
  v_total_remaining := v_daily.daily_remaining + v_pool_remaining + v_purchased;

  IF v_tier = 'free' THEN
    v_trial_days_left := public._ai_free_daily_trial_days_left(_user_id);
    v_free_trial_ends := public._ai_free_trial_ends_at(_user_id);
    IF EXISTS (SELECT 1 FROM public.user_ai_period WHERE user_id = _user_id AND period_key = 'free-starter') THEN
      IF v_total_remaining <= 0 AND v_daily.daily_limit <= 0 THEN v_period_type := 'free_starter_ended';
      ELSE v_period_type := 'free_starter'; END IF;
    ELSIF v_trial_days_left > 0 THEN v_period_type := 'free_daily_trial';
    ELSE v_period_type := 'free_daily_ended'; END IF;
  ELSIF v_period.period_key LIKE 'sub:%' THEN v_period_type := 'subscription'; END IF;

  RETURN jsonb_build_object(
    'tier', v_tier, 'period_key', v_period.period_key, 'period_end', v_period.period_end,
    'period_type', v_period_type, 'included_used', v_included_used, 'included_limit', v_included_limit,
    'included_remaining', v_pool_remaining, 'purchased_balance', v_purchased,
    'daily_remaining', v_daily.daily_remaining, 'daily_limit', v_daily.daily_limit,
    'daily_eligible', v_daily.daily_limit > 0, 'daily_period_key', v_daily.daily_period_key,
    'daily_resets_at', public._ai_daily_period_end(),
    'free_trial_days_left', v_trial_days_left, 'free_trial_ends_at', v_free_trial_ends,
    'total_remaining', v_total_remaining
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_ai_credits(
  _user_id uuid, _feature text, _environment text DEFAULT 'sandbox', _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_period record; v_daily_key text; v_daily_limit integer := 0; v_daily_used integer := 0; v_daily_remaining integer := 0;
  v_cost integer; v_included_used integer := 0; v_included_limit integer; v_included_remaining integer;
  v_purchased integer := 0; v_from_daily integer := 0; v_from_included integer := 0; v_from_purchased integer := 0;
  v_prev jsonb; v_source text; v_has_credits_row boolean := false; v_total_remaining integer;
BEGIN
  IF _user_id IS NULL THEN RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated'); END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT jsonb_build_object(
      'allowed', true, 'duplicate', true, 'cost', cost,
      'daily_remaining', (metadata->>'daily_remaining')::integer,
      'daily_limit', (metadata->>'daily_limit')::integer,
      'included_used', (metadata->>'included_used_after')::integer,
      'included_limit', (metadata->>'included_limit')::integer,
      'included_remaining', (metadata->>'included_remaining')::integer,
      'purchased_balance', (metadata->>'purchased_after')::integer,
      'total_remaining', (metadata->>'total_remaining')::integer
    ) INTO v_prev FROM public.ai_credit_ledger WHERE idempotency_key = _idempotency_key;
    IF FOUND THEN RETURN v_prev; END IF;
  END IF;

  SELECT cost INTO v_cost FROM public.ai_feature_costs WHERE feature = _feature;
  IF v_cost IS NULL THEN v_cost := 1; END IF;
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  v_included_limit := v_period.included_limit;
  v_daily_key := public._ai_daily_period_key();
  v_daily_limit := public._ai_daily_limit(_user_id);

  INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
  VALUES (_user_id, v_period.period_key, v_included_limit, 0, v_period.period_end)
  ON CONFLICT (user_id, period_key) DO NOTHING;

  IF v_daily_limit > 0 THEN
    INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
    VALUES (_user_id, v_daily_key, v_daily_limit, 0, public._ai_daily_period_end())
    ON CONFLICT (user_id, period_key) DO NOTHING;
  END IF;

  SELECT included_used INTO v_included_used FROM public.user_ai_period
   WHERE user_id = _user_id AND period_key = v_period.period_key FOR UPDATE;
  IF v_daily_limit > 0 THEN
    SELECT included_used, included_limit INTO v_daily_used, v_daily_limit
      FROM public.user_ai_period WHERE user_id = _user_id AND period_key = v_daily_key FOR UPDATE;
  END IF;

  v_included_used := COALESCE(v_included_used, 0);
  v_daily_used := COALESCE(v_daily_used, 0);
  v_daily_limit := COALESCE(v_daily_limit, 0);
  v_daily_remaining := GREATEST(0, v_daily_limit - v_daily_used);

  SELECT balance INTO v_purchased FROM public.user_credits
   WHERE user_id = _user_id AND environment = _environment FOR UPDATE;
  IF FOUND THEN v_has_credits_row := true; v_purchased := COALESCE(v_purchased, 0); ELSE v_purchased := 0; END IF;

  v_included_remaining := GREATEST(0, v_included_limit - v_included_used);
  IF v_daily_remaining + v_included_remaining + v_purchased < v_cost THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded', 'cost', v_cost,
      'daily_remaining', v_daily_remaining, 'daily_limit', v_daily_limit,
      'included_used', v_included_used, 'included_limit', v_included_limit,
      'included_remaining', v_included_remaining, 'purchased_balance', v_purchased,
      'total_remaining', v_daily_remaining + v_included_remaining + v_purchased);
  END IF;

  v_from_daily := LEAST(v_cost, v_daily_remaining);
  v_from_included := LEAST(v_cost - v_from_daily, v_included_remaining);
  v_from_purchased := v_cost - v_from_daily - v_from_included;

  IF v_from_daily > 0 THEN
    UPDATE public.user_ai_period SET included_used = included_used + v_from_daily, updated_at = now()
     WHERE user_id = _user_id AND period_key = v_daily_key;
    v_daily_used := v_daily_used + v_from_daily;
    v_daily_remaining := v_daily_remaining - v_from_daily;
  END IF;
  IF v_from_included > 0 THEN
    UPDATE public.user_ai_period SET included_used = included_used + v_from_included, updated_at = now()
     WHERE user_id = _user_id AND period_key = v_period.period_key;
    v_included_used := v_included_used + v_from_included;
    v_included_remaining := v_included_remaining - v_from_included;
  END IF;
  IF v_from_purchased > 0 THEN
    IF v_has_credits_row THEN
      UPDATE public.user_credits SET balance = balance - v_from_purchased, updated_at = now()
       WHERE user_id = _user_id AND environment = _environment;
    ELSE RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded'); END IF;
    v_purchased := v_purchased - v_from_purchased;
  END IF;

  IF (v_from_daily > 0)::int + (v_from_included > 0)::int + (v_from_purchased > 0)::int > 1 THEN v_source := 'mixed';
  ELSIF v_from_purchased > 0 THEN v_source := 'purchased';
  ELSIF v_from_included > 0 THEN v_source := 'included';
  ELSE v_source := 'daily'; END IF;

  v_total_remaining := v_daily_remaining + v_included_remaining + v_purchased;
  INSERT INTO public.ai_credit_ledger (user_id, feature, cost, source, idempotency_key, metadata)
  VALUES (_user_id, _feature, v_cost, v_source, _idempotency_key, jsonb_build_object(
    'from_daily', v_from_daily, 'from_included', v_from_included, 'from_purchased', v_from_purchased,
    'daily_remaining', v_daily_remaining, 'daily_limit', v_daily_limit, 'daily_period_key', v_daily_key,
    'included_used_after', v_included_used, 'included_limit', v_included_limit,
    'included_remaining', v_included_remaining, 'purchased_after', v_purchased,
    'total_remaining', v_total_remaining, 'environment', _environment));

  RETURN jsonb_build_object('allowed', true, 'cost', v_cost, 'source', v_source,
    'daily_remaining', v_daily_remaining, 'daily_limit', v_daily_limit,
    'included_used', v_included_used, 'included_limit', v_included_limit,
    'included_remaining', v_included_remaining, 'purchased_balance', v_purchased,
    'total_remaining', v_total_remaining);
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_ai_credits(
  _user_id uuid, _original_idempotency_key text, _refund_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_entry record; v_period record; v_env text;
  v_refunded_daily integer := 0; v_refunded_included integer := 0; v_refunded_purchased integer := 0;
  v_daily_key text;
BEGIN
  IF _user_id IS NULL OR _original_idempotency_key IS NULL OR _refund_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('refunded', false, 'reason', 'invalid_args');
  END IF;
  IF EXISTS (SELECT 1 FROM public.ai_credit_ledger WHERE idempotency_key = _refund_idempotency_key) THEN
    RETURN jsonb_build_object('refunded', true, 'duplicate', true);
  END IF;
  SELECT * INTO v_entry FROM public.ai_credit_ledger
   WHERE user_id = _user_id AND idempotency_key = _original_idempotency_key LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('refunded', false, 'reason', 'original_not_found'); END IF;

  v_env := COALESCE(v_entry.metadata->>'environment', 'sandbox');
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  v_daily_key := COALESCE(v_entry.metadata->>'daily_period_key', public._ai_daily_period_key());

  v_refunded_daily := COALESCE((v_entry.metadata->>'from_daily')::integer, 0);
  v_refunded_included := COALESCE((v_entry.metadata->>'from_included')::integer, 0);
  v_refunded_purchased := COALESCE((v_entry.metadata->>'from_purchased')::integer, 0);

  IF v_refunded_daily = 0 AND v_refunded_included = 0 AND v_refunded_purchased = 0 THEN
    IF v_entry.source = 'purchased' THEN v_refunded_purchased := v_entry.cost;
    ELSIF v_entry.source = 'daily' THEN v_refunded_daily := v_entry.cost;
    ELSIF v_entry.source = 'mixed' THEN
      v_refunded_included := COALESCE((v_entry.metadata->>'from_included')::integer, v_entry.cost);
      v_refunded_purchased := GREATEST(0, v_entry.cost - v_refunded_included);
    ELSE v_refunded_included := v_entry.cost; END IF;
  END IF;

  IF v_refunded_daily > 0 THEN
    UPDATE public.user_ai_period SET included_used = GREATEST(0, included_used - v_refunded_daily), updated_at = now()
     WHERE user_id = _user_id AND period_key = v_daily_key;
  END IF;
  IF v_refunded_included > 0 THEN
    UPDATE public.user_ai_period SET included_used = GREATEST(0, included_used - v_refunded_included), updated_at = now()
     WHERE user_id = _user_id AND period_key = v_period.period_key;
  END IF;
  IF v_refunded_purchased > 0 THEN
    UPDATE public.user_credits SET balance = balance + v_refunded_purchased, updated_at = now()
     WHERE user_id = _user_id AND environment = v_env;
  END IF;

  INSERT INTO public.ai_credit_ledger (user_id, feature, cost, source, idempotency_key, metadata)
  VALUES (_user_id, 'refund:' || v_entry.feature, -v_entry.cost, 'refund', _refund_idempotency_key,
    jsonb_build_object('refund_of', _original_idempotency_key,
      'refunded_daily', v_refunded_daily, 'refunded_included', v_refunded_included,
      'refunded_purchased', v_refunded_purchased, 'environment', v_env));

  RETURN jsonb_build_object('refunded', true, 'cost', v_entry.cost,
    'refunded_daily', v_refunded_daily, 'refunded_included', v_refunded_included,
    'refunded_purchased', v_refunded_purchased);
END;
$$;

ALTER TABLE public.ai_tier_config DROP CONSTRAINT IF EXISTS ai_tier_config_tier_check;
ALTER TABLE public.ai_tier_config ADD CONSTRAINT ai_tier_config_tier_check
  CHECK (tier IN ('free', 'pro', 'pro_plus', 'inhouse'));

INSERT INTO public.ai_tier_config (tier, monthly_included)
VALUES ('pro_plus', 1400)
ON CONFLICT (tier) DO UPDATE SET monthly_included = EXCLUDED.monthly_included, updated_at = now();
