-- Refund AI credits when a debited request fails after charge (e.g. empty LLM response).

CREATE OR REPLACE FUNCTION public.refund_ai_credits(
  _user_id uuid,
  _original_idempotency_key text,
  _refund_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry record;
  v_period record;
  v_env text;
  v_refunded_included integer := 0;
  v_refunded_purchased integer := 0;
BEGIN
  IF _user_id IS NULL OR _original_idempotency_key IS NULL OR _refund_idempotency_key IS NULL THEN
    RETURN jsonb_build_object('refunded', false, 'reason', 'invalid_args');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ai_credit_ledger
    WHERE idempotency_key = _refund_idempotency_key
  ) THEN
    RETURN jsonb_build_object('refunded', true, 'duplicate', true);
  END IF;

  SELECT * INTO v_entry
    FROM public.ai_credit_ledger
   WHERE user_id = _user_id
     AND idempotency_key = _original_idempotency_key
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('refunded', false, 'reason', 'original_not_found');
  END IF;

  v_env := COALESCE(v_entry.metadata->>'environment', 'sandbox');

  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);

  IF v_entry.source = 'purchased' THEN
    v_refunded_purchased := v_entry.cost;
    UPDATE public.user_credits
       SET balance = balance + v_refunded_purchased, updated_at = now()
     WHERE user_id = _user_id AND environment = v_env;
  ELSIF v_entry.source = 'mixed' THEN
    v_refunded_included := COALESCE((v_entry.metadata->>'from_included')::integer, v_entry.cost);
    v_refunded_purchased := GREATEST(0, v_entry.cost - v_refunded_included);
    IF v_refunded_included > 0 THEN
      UPDATE public.user_ai_period
         SET included_used = GREATEST(0, included_used - v_refunded_included), updated_at = now()
       WHERE user_id = _user_id AND period_key = v_period.period_key;
    END IF;
    IF v_refunded_purchased > 0 THEN
      UPDATE public.user_credits
         SET balance = balance + v_refunded_purchased, updated_at = now()
       WHERE user_id = _user_id AND environment = v_env;
    END IF;
  ELSE
    v_refunded_included := v_entry.cost;
    UPDATE public.user_ai_period
       SET included_used = GREATEST(0, included_used - v_refunded_included), updated_at = now()
     WHERE user_id = _user_id AND period_key = v_period.period_key;
  END IF;

  INSERT INTO public.ai_credit_ledger (user_id, feature, cost, source, idempotency_key, metadata)
  VALUES (
    _user_id,
    'refund:' || v_entry.feature,
    -v_entry.cost,
    'refund',
    _refund_idempotency_key,
    jsonb_build_object(
      'refund_of', _original_idempotency_key,
      'refunded_included', v_refunded_included,
      'refunded_purchased', v_refunded_purchased,
      'environment', v_env
    )
  );

  RETURN jsonb_build_object(
    'refunded', true,
    'cost', v_entry.cost,
    'refunded_included', v_refunded_included,
    'refunded_purchased', v_refunded_purchased
  );
END;
$$;

-- Store debit split in metadata for accurate mixed refunds.
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
      'from_included', v_from_included,
      'from_purchased', v_from_purchased,
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

GRANT EXECUTE ON FUNCTION public.refund_ai_credits(uuid, text, text) TO service_role;
