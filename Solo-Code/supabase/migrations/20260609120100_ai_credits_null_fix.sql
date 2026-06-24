-- Fix: SELECT INTO with no user_credits row nulls purchased balance in usage/debit RPCs.

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
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'unauthenticated');
  END IF;

  v_tier := public._ai_user_tier(_user_id);
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);

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
    'included_used', v_included_used,
    'included_limit', v_included_limit,
    'included_remaining', GREATEST(0, v_included_limit - v_included_used),
    'purchased_balance', v_purchased,
    'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_ai_credits(
  _user_id uuid,
  _feature text,
  _environment text DEFAULT 'sandbox',
  _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period record;
  v_cost integer;
  v_included_used integer := 0;
  v_included_limit integer;
  v_included_remaining integer;
  v_purchased integer := 0;
  v_from_included integer := 0;
  v_from_purchased integer := 0;
  v_prev jsonb;
  v_source text;
  v_has_credits_row boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  IF _idempotency_key IS NOT NULL THEN
    SELECT jsonb_build_object(
      'allowed', true,
      'duplicate', true,
      'cost', cost,
      'included_used', (metadata->>'included_used_after')::integer,
      'included_limit', (metadata->>'included_limit')::integer,
      'purchased_balance', (metadata->>'purchased_after')::integer,
      'total_remaining', (metadata->>'total_remaining')::integer
    ) INTO v_prev
    FROM public.ai_credit_ledger
   WHERE idempotency_key = _idempotency_key;

    IF FOUND THEN RETURN v_prev; END IF;
  END IF;

  SELECT cost INTO v_cost FROM public.ai_feature_costs WHERE feature = _feature;
  IF v_cost IS NULL THEN v_cost := 1; END IF;

  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  v_included_limit := v_period.included_limit;

  INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
  VALUES (_user_id, v_period.period_key, v_included_limit, 0, v_period.period_end)
  ON CONFLICT (user_id, period_key) DO NOTHING;

  SELECT included_used INTO v_included_used
    FROM public.user_ai_period
   WHERE user_id = _user_id AND period_key = v_period.period_key
   FOR UPDATE;

  v_included_used := COALESCE(v_included_used, 0);

  SELECT balance INTO v_purchased
    FROM public.user_credits
   WHERE user_id = _user_id AND environment = _environment
   FOR UPDATE;

  IF FOUND THEN
    v_has_credits_row := true;
    v_purchased := COALESCE(v_purchased, 0);
  ELSE
    v_purchased := 0;
  END IF;

  v_included_remaining := GREATEST(0, v_included_limit - v_included_used);

  IF v_included_remaining + v_purchased < v_cost THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'cost', v_cost,
      'included_used', v_included_used,
      'included_limit', v_included_limit,
      'included_remaining', v_included_remaining,
      'purchased_balance', v_purchased,
      'total_remaining', v_included_remaining + v_purchased
    );
  END IF;

  v_from_included := LEAST(v_cost, v_included_remaining);
  v_from_purchased := v_cost - v_from_included;

  IF v_from_included > 0 THEN
    UPDATE public.user_ai_period
       SET included_used = included_used + v_from_included, updated_at = now()
     WHERE user_id = _user_id AND period_key = v_period.period_key;
    v_included_used := v_included_used + v_from_included;
  END IF;

  IF v_from_purchased > 0 THEN
    IF v_has_credits_row THEN
      UPDATE public.user_credits
         SET balance = balance - v_from_purchased, updated_at = now()
       WHERE user_id = _user_id AND environment = _environment;
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded');
    END IF;
    v_purchased := v_purchased - v_from_purchased;
  END IF;

  IF v_from_included > 0 AND v_from_purchased > 0 THEN
    v_source := 'mixed';
  ELSIF v_from_purchased > 0 THEN
    v_source := 'purchased';
  ELSE
    v_source := 'included';
  END IF;

  INSERT INTO public.ai_credit_ledger (user_id, feature, cost, source, idempotency_key, metadata)
  VALUES (
    _user_id,
    _feature,
    v_cost,
    v_source,
    _idempotency_key,
    jsonb_build_object(
      'included_used_after', v_included_used,
      'included_limit', v_included_limit,
      'purchased_after', v_purchased,
      'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased,
      'environment', _environment
    )
  );

  RETURN jsonb_build_object(
    'allowed', true,
    'cost', v_cost,
    'source', v_source,
    'included_used', v_included_used,
    'included_limit', v_included_limit,
    'included_remaining', GREATEST(0, v_included_limit - v_included_used),
    'purchased_balance', v_purchased,
    'total_remaining', GREATEST(0, v_included_limit - v_included_used) + v_purchased
  );
END;
$$;
