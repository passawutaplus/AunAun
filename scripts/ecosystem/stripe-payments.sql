-- Stripe payments: webhook idempotency, AI credits atomic top-up, PX wallet Stripe top-up, Connect cashout.
-- Unified Supabase: billing tables in public; wallet/gifting in shared schema.

-- ---------------------------------------------------------------------------
-- Webhook + checkout fulfillment audit (public)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.stripe_checkout_fulfillments (
  stripe_session_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('credits', 'px')),
  price_id text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  environment text NOT NULL CHECK (environment IN ('sandbox', 'live')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_checkout_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mock_topup_enabled boolean NOT NULL DEFAULT false,
  mock_ad_pay_enabled boolean NOT NULL DEFAULT false,
  stripe_px_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.payment_settings (id, mock_topup_enabled, mock_ad_pay_enabled, stripe_px_enabled)
VALUES (1, false, false, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_settings_admin_select ON public.payment_settings;
CREATE POLICY payment_settings_admin_select ON public.payment_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS payment_settings_admin_update ON public.payment_settings;
CREATE POLICY payment_settings_admin_update ON public.payment_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON TABLE public.payment_settings FROM anon;
GRANT SELECT, UPDATE ON TABLE public.payment_settings TO authenticated;

-- ---------------------------------------------------------------------------
-- shared.wallet_topups — Stripe columns
-- ---------------------------------------------------------------------------

ALTER TABLE shared.wallet_topups
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS payment_provider text DEFAULT 'mock',
  ADD COLUMN IF NOT EXISTS amount_cents integer;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_topups_stripe_session_id_key
  ON shared.wallet_topups (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- public.profiles — Stripe Connect
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connect_accounts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS connect_onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS connect_payouts_enabled boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_connect_account_id_key
  ON public.profiles (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- shared.cashout_requests — Stripe transfer tracking
-- ---------------------------------------------------------------------------

ALTER TABLE shared.cashout_requests
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS failure_reason text;

-- ---------------------------------------------------------------------------
-- RPC: atomic AI credit top-up (Stripe checkout)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.add_ai_credits_atomic(
  _user_id uuid,
  _environment text,
  _credits integer,
  _stripe_session_id text,
  _price_id text DEFAULT 'unknown'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing integer;
  _new_balance integer;
BEGIN
  IF _credits <= 0 THEN
    RAISE EXCEPTION 'INVALID_CREDITS';
  END IF;
  IF _environment NOT IN ('sandbox', 'live') THEN
    RAISE EXCEPTION 'INVALID_ENVIRONMENT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_checkout_fulfillments
    WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT balance INTO _existing
    FROM public.user_credits
    WHERE user_id = _user_id AND environment = _environment;
    RETURN COALESCE(_existing, 0);
  END IF;

  INSERT INTO public.stripe_checkout_fulfillments (
    stripe_session_id, user_id, kind, price_id, quantity, environment
  ) VALUES (
    _stripe_session_id, _user_id, 'credits', _price_id, _credits, _environment
  );

  INSERT INTO public.user_credits (user_id, environment, balance, lifetime_purchased)
  VALUES (_user_id, _environment, _credits, _credits)
  ON CONFLICT (user_id, environment) DO UPDATE SET
    balance = user_credits.balance + EXCLUDED.balance,
    lifetime_purchased = user_credits.lifetime_purchased + EXCLUDED.lifetime_purchased,
    updated_at = now()
  RETURNING balance INTO _new_balance;

  RETURN _new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.add_ai_credits_atomic(uuid, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_ai_credits_atomic(uuid, text, integer, text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: PX wallet top-up via Stripe
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.topup_wallet_stripe(
  _user_id uuid,
  _amount_px integer,
  _stripe_session_id text,
  _amount_cents integer DEFAULT NULL,
  _price_id text DEFAULT 'unknown',
  _environment text DEFAULT 'sandbox'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _topup_id uuid;
  _hold_hours integer;
BEGIN
  IF _amount_px <= 0 OR _amount_px > 100000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;
  IF _environment NOT IN ('sandbox', 'live') THEN
    RAISE EXCEPTION 'INVALID_ENVIRONMENT';
  END IF;

  IF NOT (SELECT stripe_px_enabled FROM public.payment_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'STRIPE_PX_DISABLED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_checkout_fulfillments
    WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT id INTO _topup_id
    FROM shared.wallet_topups
    WHERE stripe_session_id = _stripe_session_id;
    RETURN _topup_id;
  END IF;

  SELECT hold_hours INTO _hold_hours FROM shared.gift_limits_config WHERE id = 1;
  _hold_hours := COALESCE(_hold_hours, 0);

  INSERT INTO public.stripe_checkout_fulfillments (
    stripe_session_id, user_id, kind, price_id, quantity, environment
  ) VALUES (
    _stripe_session_id, _user_id, 'px', _price_id, _amount_px, _environment
  );

  INSERT INTO shared.wallet_topups (
    user_id,
    amount_px,
    method,
    status,
    payment_provider,
    stripe_session_id,
    amount_cents,
    available_at
  ) VALUES (
    _user_id,
    _amount_px,
    'stripe',
    'completed',
    'stripe',
    _stripe_session_id,
    _amount_cents,
    now() + (_hold_hours || ' hours')::interval
  )
  RETURNING id INTO _topup_id;

  INSERT INTO shared.wallets (user_id, purchased_px)
  VALUES (_user_id, _amount_px)
  ON CONFLICT (user_id) DO UPDATE SET
    purchased_px = shared.wallets.purchased_px + EXCLUDED.purchased_px,
    updated_at = now();

  RETURN _topup_id;
END;
$$;

REVOKE ALL ON FUNCTION public.topup_wallet_stripe(uuid, integer, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.topup_wallet_stripe(uuid, integer, text, integer, text, text) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: guard mock top-up (disable when mock_topup_enabled = false)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.topup_wallet_mock(_amount_px integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _topup_id uuid;
  _hold_hours integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF NOT COALESCE((SELECT mock_topup_enabled FROM public.payment_settings WHERE id = 1), false) THEN
    RAISE EXCEPTION 'MOCK_TOPUP_DISABLED';
  END IF;

  IF _amount_px <= 0 OR _amount_px > 100000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT hold_hours INTO _hold_hours FROM shared.gift_limits_config WHERE id = 1;
  _hold_hours := COALESCE(_hold_hours, 0);

  INSERT INTO shared.wallet_topups (
    user_id, amount_px, method, status, payment_provider, available_at
  ) VALUES (
    _uid, _amount_px, 'mock', 'completed', 'mock',
    now() + (_hold_hours || ' hours')::interval
  )
  RETURNING id INTO _topup_id;

  INSERT INTO shared.wallets (user_id, purchased_px)
  VALUES (_uid, _amount_px)
  ON CONFLICT (user_id) DO UPDATE SET
    purchased_px = shared.wallets.purchased_px + EXCLUDED.purchased_px,
    updated_at = now();

  RETURN _topup_id;
END;
$$;

REVOKE ALL ON FUNCTION public.topup_wallet_mock(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.topup_wallet_mock(integer) TO service_role;

-- ---------------------------------------------------------------------------
-- RPC: Connect profile sync + cashout Stripe lifecycle
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_connect_account(
  _user_id uuid,
  _account_id text,
  _onboarding_complete boolean,
  _payouts_enabled boolean,
  _environment text DEFAULT 'sandbox'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _environment NOT IN ('sandbox', 'live') THEN
    RAISE EXCEPTION 'INVALID_ENVIRONMENT';
  END IF;

  UPDATE public.profiles SET
    stripe_connect_account_id = COALESCE(_account_id, stripe_connect_account_id),
    stripe_connect_accounts = COALESCE(stripe_connect_accounts, '{}'::jsonb)
      || jsonb_build_object(_environment, _account_id),
    connect_onboarding_complete = _onboarding_complete,
    connect_payouts_enabled = _payouts_enabled,
    updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_connect_account(uuid, text, boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_connect_account(uuid, text, boolean, boolean, text) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_cashout_processing(
  _cashout_id uuid,
  _stripe_transfer_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
BEGIN
  UPDATE shared.cashout_requests SET
    status = 'processing',
    stripe_transfer_id = _stripe_transfer_id,
    processed_at = now()
  WHERE id = _cashout_id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.mark_cashout_processing(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_cashout_processing(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_cashout_paid_stripe(_cashout_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
BEGIN
  UPDATE shared.cashout_requests SET
    status = 'paid',
    processed_at = now()
  WHERE id = _cashout_id AND status IN ('pending', 'processing');
END;
$$;

REVOKE ALL ON FUNCTION public.mark_cashout_paid_stripe(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_cashout_paid_stripe(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_cashout_failed_stripe(
  _cashout_id uuid,
  _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _row shared.cashout_requests%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM shared.cashout_requests WHERE id = _cashout_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF _row.status NOT IN ('pending', 'processing') THEN RETURN; END IF;

  UPDATE shared.wallets SET
    earned_px = earned_px + _row.gross_px,
    updated_at = now()
  WHERE user_id = _row.user_id;

  UPDATE shared.cashout_requests SET
    status = 'failed',
    failure_reason = _reason,
    processed_at = now()
  WHERE id = _cashout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_cashout_failed_stripe(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_cashout_failed_stripe(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_cashout_reversed_stripe(
  _cashout_id uuid,
  _reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _row shared.cashout_requests%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM shared.cashout_requests WHERE id = _cashout_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF _row.status NOT IN ('processing', 'paid') THEN RETURN; END IF;

  UPDATE shared.wallets SET
    earned_px = earned_px + _row.gross_px,
    updated_at = now()
  WHERE user_id = _row.user_id;

  UPDATE shared.cashout_requests SET
    status = 'failed',
    failure_reason = COALESCE(_reason, 'transfer_reversed'),
    processed_at = now()
  WHERE id = _cashout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_cashout_reversed_stripe(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_cashout_reversed_stripe(uuid, text) TO service_role;
