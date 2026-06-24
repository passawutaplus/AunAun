-- Unified AI credits: monthly included allowance per tier + purchased top-up balance.

-- Global tier monthly allowances
CREATE TABLE IF NOT EXISTS public.ai_tier_config (
  tier text PRIMARY KEY CHECK (tier IN ('free', 'pro', 'inhouse')),
  monthly_included integer NOT NULL CHECK (monthly_included > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_tier_config (tier, monthly_included) VALUES
  ('free', 80),
  ('pro', 800),
  ('inhouse', 2000)
ON CONFLICT (tier) DO NOTHING;

GRANT SELECT ON public.ai_tier_config TO authenticated, service_role;

-- Per-feature credit cost
CREATE TABLE IF NOT EXISTS public.ai_feature_costs (
  feature text PRIMARY KEY,
  cost integer NOT NULL CHECK (cost > 0),
  label text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_feature_costs (feature, cost, label) VALUES
  ('ai_assistant_mentor', 1, 'So1o Assistant'),
  ('ai_assistant_business', 3, 'So1o Assistant (ธุรกิจ)'),
  ('planner_ai_assist', 2, 'Content Planner AI'),
  ('color_mentor', 2, 'Color Mentor'),
  ('ai_price_suggest', 2, 'AI แนะนำราคา'),
  ('ai_design_chat', 1, 'AI Design Chat'),
  ('generate_contract', 5, 'สร้างสัญญา AI')
ON CONFLICT (feature) DO NOTHING;

GRANT SELECT ON public.ai_feature_costs TO authenticated, service_role;

-- Monthly included usage per user per billing/calendar period
CREATE TABLE IF NOT EXISTS public.user_ai_period (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  included_limit integer NOT NULL CHECK (included_limit > 0),
  included_used integer NOT NULL DEFAULT 0 CHECK (included_used >= 0),
  period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_period_user ON public.user_ai_period (user_id);

GRANT SELECT ON public.user_ai_period TO authenticated;
GRANT ALL ON public.user_ai_period TO service_role;

ALTER TABLE public.user_ai_period ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own ai period" ON public.user_ai_period;
CREATE POLICY "Users view own ai period"
  ON public.user_ai_period FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Audit ledger
CREATE TABLE IF NOT EXISTS public.ai_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  cost integer NOT NULL CHECK (cost > 0),
  source text NOT NULL CHECK (source IN ('included', 'purchased', 'mixed')),
  idempotency_key text UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_credit_ledger_user_created
  ON public.ai_credit_ledger (user_id, created_at DESC);

GRANT SELECT ON public.ai_credit_ledger TO authenticated;
GRANT ALL ON public.ai_credit_ledger TO service_role;

ALTER TABLE public.ai_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own ai ledger" ON public.ai_credit_ledger;
CREATE POLICY "Users view own ai ledger"
  ON public.ai_credit_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Resolve user tier from profiles
CREATE OR REPLACE FUNCTION public._ai_user_tier(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT subscription_tier FROM public.profiles WHERE user_id = _user_id),
    'free'
  );
$$;

-- Period key: calendar month (Bangkok) for free; subscription period end for paid tiers
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
BEGIN
  v_tier := public._ai_user_tier(_user_id);
  SELECT monthly_included INTO v_limit FROM public.ai_tier_config WHERE tier = v_tier;
  IF v_limit IS NULL THEN v_limit := 80; END IF;

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

-- Read-only usage summary for UI
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

GRANT EXECUTE ON FUNCTION public.get_ai_usage_summary(uuid, text) TO authenticated, service_role;

-- Atomic debit: included first, then purchased top-up
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

GRANT EXECUTE ON FUNCTION public.debit_ai_credits(uuid, text, text, text) TO service_role;

-- Reset included usage on subscription renewal (called from Stripe webhook)
CREATE OR REPLACE FUNCTION public.reset_ai_period_on_renewal(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period record;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  SELECT * INTO v_period FROM public._ai_resolve_period(_user_id);
  INSERT INTO public.user_ai_period (user_id, period_key, included_limit, included_used, period_end)
  VALUES (_user_id, v_period.period_key, v_period.included_limit, 0, v_period.period_end)
  ON CONFLICT (user_id, period_key) DO UPDATE
    SET included_used = 0,
        included_limit = EXCLUDED.included_limit,
        period_end = EXCLUDED.period_end,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_ai_period_on_renewal(uuid) TO service_role;
