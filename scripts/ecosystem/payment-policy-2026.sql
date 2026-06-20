-- Payment policy 2026: PX instant use, tiered cashout/escrow fees, welcome cap 100, ads project landing
-- Apply after stripe-payments.sql + boost-escrow-payments.sql

-- ---------------------------------------------------------------------------
-- Central config (ops can UPDATE without redeploy)
-- ---------------------------------------------------------------------------

ALTER TABLE shared.gift_limits_config
  ADD COLUMN IF NOT EXISTS welcome_px_cap integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS cashout_fee_free numeric(5,4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS cashout_fee_pro numeric(5,4) NOT NULL DEFAULT 0.10,
  ADD COLUMN IF NOT EXISTS escrow_fee_free numeric(5,4) NOT NULL DEFAULT 0.05,
  ADD COLUMN IF NOT EXISTS escrow_fee_pro numeric(5,4) NOT NULL DEFAULT 0.025;

UPDATE shared.gift_limits_config SET
  hold_hours = 0,
  welcome_px_cap = 100,
  cashout_fee_free = 0.15,
  cashout_fee_pro = 0.10,
  escrow_fee_free = 0.05,
  escrow_fee_pro = 0.025,
  updated_at = now()
WHERE id = 1;

-- ---------------------------------------------------------------------------
-- Fee helpers (tier from profiles.subscription_tier)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_pro_tier(_tier text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(_tier, 'free') IN ('pro', 'pro_plus', 'inhouse');
$$;

CREATE OR REPLACE FUNCTION public.cashout_platform_fee_pct(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
  SELECT CASE
    WHEN public.is_pro_tier(
      (SELECT subscription_tier FROM public.profiles WHERE user_id = _user_id)
    ) THEN COALESCE(
      (SELECT cashout_fee_pro FROM shared.gift_limits_config WHERE id = 1),
      0.10
    )
    ELSE COALESCE(
      (SELECT cashout_fee_free FROM shared.gift_limits_config WHERE id = 1),
      0.15
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.cashout_platform_fee_pct(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cashout_platform_fee_pct(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.escrow_platform_fee_pct(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
  SELECT CASE
    WHEN public.is_pro_tier(
      (SELECT subscription_tier FROM public.profiles WHERE user_id = _user_id)
    ) THEN COALESCE(
      (SELECT escrow_fee_pro FROM shared.gift_limits_config WHERE id = 1),
      0.025
    )
    ELSE COALESCE(
      (SELECT escrow_fee_free FROM shared.gift_limits_config WHERE id = 1),
      0.05
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.escrow_platform_fee_pct(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escrow_platform_fee_pct(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- PX top-up: instant use (hold_hours default 0)
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
    user_id, amount_px, method, status, payment_provider,
    stripe_session_id, amount_cents, available_at
  ) VALUES (
    _user_id, _amount_px, 'stripe', 'completed', 'stripe',
    _stripe_session_id, _amount_cents,
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
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  IF NOT COALESCE((SELECT mock_topup_enabled FROM public.payment_settings WHERE id = 1), false) THEN
    RAISE EXCEPTION 'MOCK_TOPUP_DISABLED';
  END IF;

  IF _amount_px <= 0 OR _amount_px > 100000 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  SELECT hold_hours INTO _hold_hours FROM shared.gift_limits_config WHERE id = 1;
  _hold_hours := COALESCE(_hold_hours, 0);

  INSERT INTO shared.wallet_topups (
    user_id, amount_px, method, status, available_at
  ) VALUES (
    _uid, _amount_px, 'mock', 'completed',
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

-- Purchased px available immediately (no hold filter)
CREATE OR REPLACE FUNCTION public.available_purchased_px(_uid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
  SELECT COALESCE((SELECT purchased_px FROM shared.wallets WHERE user_id = _uid), 0);
$$;

GRANT EXECUTE ON FUNCTION public.available_purchased_px(uuid) TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Welcome missions — cap 100 px total
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.welcome_mission_reward_px(_mission_id text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _mission_id
    WHEN 'explore_feed' THEN 8
    WHEN 'like' THEN 8
    WHEN 'follow' THEN 10
    WHEN 'jobs' THEN 10
    WHEN 'skills' THEN 12
    WHEN 'share_profile' THEN 14
    WHEN 'profile' THEN 16
    WHEN 'publish_project' THEN 22
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.claim_welcome_mission(_mission_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _reward integer;
  _cap integer;
  _wallet shared.wallets%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  _reward := public.welcome_mission_reward_px(_mission_id);
  IF _reward <= 0 THEN RAISE EXCEPTION 'INVALID_MISSION'; END IF;

  IF EXISTS (
    SELECT 1 FROM shared.welcome_mission_claims
    WHERE user_id = _uid AND mission_id = _mission_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED';
  END IF;

  SELECT COALESCE(welcome_px_cap, 100) INTO _cap
  FROM shared.gift_limits_config WHERE id = 1;

  INSERT INTO shared.wallets (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _wallet FROM shared.wallets WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_wallet.lifetime_welcome_px, 0) >= _cap THEN
    RAISE EXCEPTION 'WELCOME_CAP_REACHED';
  END IF;

  IF COALESCE(_wallet.lifetime_welcome_px, 0) + _reward > _cap THEN
    _reward := _cap - COALESCE(_wallet.lifetime_welcome_px, 0);
  END IF;

  IF _reward <= 0 THEN RAISE EXCEPTION 'WELCOME_CAP_REACHED'; END IF;

  UPDATE shared.wallets SET
    welcome_px = welcome_px + _reward,
    lifetime_welcome_px = lifetime_welcome_px + _reward,
    updated_at = now()
  WHERE user_id = _uid;

  INSERT INTO shared.welcome_mission_claims (user_id, mission_id, reward_px)
  VALUES (_uid, _mission_id, _reward);

  SELECT * INTO _wallet FROM shared.wallets WHERE user_id = _uid;

  RETURN jsonb_build_object(
    'mission_id', _mission_id,
    'reward_px', _reward,
    'welcome_px', _wallet.welcome_px,
    'lifetime_welcome_px', _wallet.lifetime_welcome_px,
    'cap', _cap
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_welcome_mission(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Cashout — tiered platform fee
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_cashout(
  _amount_px integer,
  _bank_info jsonb DEFAULT '{}'::jsonb
)
RETURNS shared.cashout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _wallet shared.wallets%ROWTYPE;
  _fee_rate numeric;
  _fee_px integer;
  _net_px integer;
  _row shared.cashout_requests%ROWTYPE;
  _min_px integer := 1000;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF _amount_px IS NULL OR _amount_px < _min_px THEN
    RAISE EXCEPTION 'MIN_CASHOUT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _uid AND is_verified = true
  ) THEN
    RAISE EXCEPTION 'KYC_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _uid
      AND connect_payouts_enabled = true
      AND connect_onboarding_complete = true
  ) THEN
    RAISE EXCEPTION 'CONNECT_REQUIRED';
  END IF;

  SELECT * INTO _wallet FROM shared.wallets WHERE user_id = _uid FOR UPDATE;
  IF NOT FOUND OR COALESCE(_wallet.earned_px, 0) < _amount_px THEN
    RAISE EXCEPTION 'INSUFFICIENT_EARNED';
  END IF;

  _fee_rate := public.cashout_platform_fee_pct(_uid);
  _fee_px := FLOOR(_amount_px * _fee_rate);
  _net_px := _amount_px - _fee_px;

  UPDATE shared.wallets SET
    earned_px = earned_px - _amount_px,
    updated_at = now()
  WHERE user_id = _uid;

  INSERT INTO shared.cashout_requests (
    user_id, gross_px, fee_px, net_px, bank_info, status
  ) VALUES (
    _uid, _amount_px, _fee_px, _net_px, COALESCE(_bank_info, '{}'::jsonb), 'pending'
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_cashout(integer, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Ads — optional in-app project landing
-- ---------------------------------------------------------------------------

ALTER TABLE anthem.ad_applications
  ADD COLUMN IF NOT EXISTS linked_project_id uuid;

ALTER TABLE anthem.ad_campaigns
  ADD COLUMN IF NOT EXISTS linked_project_id uuid;

-- Patch admin approve to copy linked_project_id (replace if exists)
CREATE OR REPLACE FUNCTION public.admin_approve_ad_application(
  _id uuid,
  _duration_days integer DEFAULT NULL
)
RETURNS anthem.ad_campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app anthem.ad_applications%ROWTYPE;
  _days integer;
  _camp anthem.ad_campaigns%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO _app FROM anthem.ad_applications WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _app.status NOT IN ('paid', 'pending') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  _days := COALESCE(_duration_days, _app.duration_days, 7);

  INSERT INTO anthem.ad_campaigns (
    advertiser_user_id, title, tagline, image_url, target_url, cta_label,
    package, price_px, status, start_at, end_at, application_id,
    promotion_text, linked_project_id
  ) VALUES (
    _app.user_id, _app.ad_title, _app.ad_tagline, _app.image_url, _app.target_url,
    COALESCE(_app.cta_label, 'เรียนรู้เพิ่มเติม'),
    _app.package, _app.budget_px, 'active', now(), now() + (_days || ' days')::interval,
    _app.id, COALESCE(_app.ad_description, ''), _app.linked_project_id
  )
  RETURNING * INTO _camp;

  UPDATE anthem.ad_applications SET
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    updated_at = now()
  WHERE id = _id;

  RETURN _camp;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_ad_application(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_ad_application(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_active_ads(_limit integer DEFAULT 12)
RETURNS SETOF anthem.ad_campaigns
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM anthem.ad_campaigns
  WHERE status = 'active'
    AND (end_at IS NULL OR end_at > now())
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 50));
$$;

GRANT EXECUTE ON FUNCTION public.get_active_ads(integer) TO anon, authenticated, service_role;
