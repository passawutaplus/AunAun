-- Boost (self-serve post promotion) + Escrow marketplace
-- Apply after stripe-payments.sql on unified Supabase project rvnzjiskqliexysicfmh

-- ---------------------------------------------------------------------------
-- Extend stripe_checkout_fulfillments kinds
-- ---------------------------------------------------------------------------

ALTER TABLE public.stripe_checkout_fulfillments
  DROP CONSTRAINT IF EXISTS stripe_checkout_fulfillments_kind_check;

ALTER TABLE public.stripe_checkout_fulfillments
  ADD CONSTRAINT stripe_checkout_fulfillments_kind_check
  CHECK (kind IN ('credits', 'px', 'boost', 'ad', 'escrow'));

-- ---------------------------------------------------------------------------
-- anthem.post_boosts — creator self-serve promotion
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS anthem.post_boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('project', 'community_post')),
  target_id uuid NOT NULL,
  package text NOT NULL CHECK (package IN ('micro_3', 'micro_7', 'micro_14')),
  amount_thb integer NOT NULL CHECK (amount_thb > 0),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'active', 'expired', 'cancelled')),
  stripe_session_id text,
  start_at timestamptz,
  end_at timestamptz,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_boosts_active
  ON anthem.post_boosts (status, end_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_post_boosts_target
  ON anthem.post_boosts (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_post_boosts_user
  ON anthem.post_boosts (user_id, created_at DESC);

ALTER TABLE anthem.post_boosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_boosts_owner_select ON anthem.post_boosts;
CREATE POLICY post_boosts_owner_select ON anthem.post_boosts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS post_boosts_public_active ON anthem.post_boosts;
CREATE POLICY post_boosts_public_active ON anthem.post_boosts
  FOR SELECT TO anon, authenticated
  USING (status = 'active' AND (end_at IS NULL OR end_at > now()));

GRANT SELECT ON anthem.post_boosts TO anon, authenticated;
GRANT ALL ON anthem.post_boosts TO service_role;

-- ---------------------------------------------------------------------------
-- shared.marketplace_escrows — client payment held until approve
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared.marketplace_escrows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hiring_request_id uuid,
  quotation_id uuid,
  client_name text NOT NULL DEFAULT '',
  client_email text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  amount_thb integer NOT NULL CHECK (amount_thb > 0),
  platform_fee_pct numeric(5,4) NOT NULL CHECK (platform_fee_pct >= 0 AND platform_fee_pct <= 1),
  platform_fee_thb integer NOT NULL DEFAULT 0 CHECK (platform_fee_thb >= 0),
  net_payout_thb integer NOT NULL CHECK (net_payout_thb >= 0),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  portal_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'pending_payment', 'funded', 'in_progress',
      'pending_release', 'released', 'disputed', 'refunded', 'cancelled'
    )),
  funded_at timestamptz,
  approved_at timestamptz,
  released_at timestamptz,
  disputed_at timestamptz,
  dispute_reason text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_escrows_freelancer
  ON shared.marketplace_escrows (freelancer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_escrows_portal
  ON shared.marketplace_escrows (portal_token);

CREATE INDEX IF NOT EXISTS idx_marketplace_escrows_status
  ON shared.marketplace_escrows (status);

ALTER TABLE shared.marketplace_escrows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketplace_escrows_freelancer_select ON shared.marketplace_escrows;
CREATE POLICY marketplace_escrows_freelancer_select ON shared.marketplace_escrows
  FOR SELECT TO authenticated
  USING (auth.uid() = freelancer_user_id);

GRANT SELECT ON shared.marketplace_escrows TO authenticated;
GRANT ALL ON shared.marketplace_escrows TO service_role;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.escrow_platform_fee_pct(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(
      (SELECT subscription_tier FROM public.profiles WHERE user_id = _user_id),
      'free'
    ) IN ('pro', 'pro_plus', 'inhouse') THEN 0.05
    ELSE 0.10
  END;
$$;

REVOKE ALL ON FUNCTION public.escrow_platform_fee_pct(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escrow_platform_fee_pct(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assert_connect_payouts_ready(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND connect_payouts_enabled = true
      AND connect_onboarding_complete = true
  ) THEN
    RAISE EXCEPTION 'CONNECT_REQUIRED';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_connect_payouts_ready(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_connect_payouts_ready(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Boost RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_post_boost(
  _target_type text,
  _target_id uuid,
  _package text
)
RETURNS anthem.post_boosts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row anthem.post_boosts%ROWTYPE;
  _amount integer;
  _days integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF _target_type NOT IN ('project', 'community_post') THEN RAISE EXCEPTION 'INVALID_TARGET_TYPE'; END IF;
  IF _package NOT IN ('micro_3', 'micro_7', 'micro_14') THEN RAISE EXCEPTION 'INVALID_PACKAGE'; END IF;

  _amount := CASE _package WHEN 'micro_3' THEN 99 WHEN 'micro_7' THEN 249 WHEN 'micro_14' THEN 499 END;
  _days := CASE _package WHEN 'micro_3' THEN 3 WHEN 'micro_7' THEN 7 WHEN 'micro_14' THEN 14 END;

  IF _target_type = 'project' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = _target_id AND owner_id = _uid AND status = 'Published'
    ) THEN
      RAISE EXCEPTION 'NOT_OWNER_OR_NOT_PUBLISHED';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM anthem.community_posts
      WHERE id = _target_id AND author_id = _uid AND status = 'published'
    ) THEN
      RAISE EXCEPTION 'NOT_OWNER_OR_NOT_PUBLISHED';
    END IF;
  END IF;

  INSERT INTO anthem.post_boosts (
    user_id, target_type, target_id, package, amount_thb, duration_days, status
  ) VALUES (
    _uid, _target_type, _target_id, _package, _amount, _days, 'pending_payment'
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_post_boost(text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_post_boost(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_post_boost(text, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.activate_post_boost_stripe(
  _stripe_session_id text,
  _boost_id uuid,
  _price_id text DEFAULT 'unknown',
  _environment text DEFAULT 'sandbox'
)
RETURNS anthem.post_boosts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _row anthem.post_boosts%ROWTYPE;
  _days integer;
BEGIN
  IF _environment NOT IN ('sandbox', 'live') THEN RAISE EXCEPTION 'INVALID_ENVIRONMENT'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_checkout_fulfillments WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT * INTO _row FROM anthem.post_boosts WHERE id = _boost_id;
    RETURN _row;
  END IF;

  SELECT * INTO _row FROM anthem.post_boosts WHERE id = _boost_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _row.status NOT IN ('pending_payment', 'active') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  _days := _row.duration_days;

  INSERT INTO public.stripe_checkout_fulfillments (
    stripe_session_id, user_id, kind, price_id, quantity, environment
  ) VALUES (
    _stripe_session_id, _row.user_id, 'boost', _price_id, 1, _environment
  );

  UPDATE anthem.post_boosts SET
    status = 'active',
    stripe_session_id = _stripe_session_id,
    start_at = now(),
    end_at = now() + (_days || ' days')::interval,
    updated_at = now()
  WHERE id = _boost_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.activate_post_boost_stripe(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_post_boost_stripe(text, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.fulfill_ad_payment_stripe(
  _stripe_session_id text,
  _application_id uuid,
  _price_id text DEFAULT 'unknown',
  _environment text DEFAULT 'sandbox'
)
RETURNS anthem.ad_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _row anthem.ad_applications%ROWTYPE;
BEGIN
  IF _environment NOT IN ('sandbox', 'live') THEN RAISE EXCEPTION 'INVALID_ENVIRONMENT'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_checkout_fulfillments WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT * INTO _row FROM anthem.ad_applications WHERE id = _application_id;
    RETURN _row;
  END IF;

  SELECT * INTO _row FROM anthem.ad_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _row.status IS DISTINCT FROM 'pending_payment' THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  INSERT INTO public.stripe_checkout_fulfillments (
    stripe_session_id, user_id, kind, price_id, quantity, environment
  ) VALUES (
    _stripe_session_id, _row.user_id, 'ad', _price_id, 1, _environment
  );

  UPDATE anthem.ad_applications SET
    status = 'paid',
    paid_at = now(),
    updated_at = now()
  WHERE id = _application_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_ad_payment_stripe(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_ad_payment_stripe(text, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_active_boosts(_limit integer DEFAULT 50)
RETURNS TABLE (
  boost_id uuid,
  target_type text,
  target_id uuid,
  end_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem
AS $$
  SELECT id, target_type, target_id, end_at
  FROM anthem.post_boosts
  WHERE status = 'active'
    AND end_at > now()
  ORDER BY end_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

GRANT EXECUTE ON FUNCTION public.get_active_boosts(integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.log_boost_event(
  _boost_id uuid,
  _event_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
BEGIN
  IF _event_type NOT IN ('impression', 'click') THEN RAISE EXCEPTION 'INVALID_EVENT'; END IF;
  IF _event_type = 'impression' THEN
    UPDATE anthem.post_boosts SET impressions = impressions + 1, updated_at = now()
    WHERE id = _boost_id AND status = 'active';
  ELSE
    UPDATE anthem.post_boosts SET clicks = clicks + 1, updated_at = now()
    WHERE id = _boost_id AND status = 'active';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_boost_event(uuid, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.expire_post_boosts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
DECLARE
  _n integer;
BEGIN
  UPDATE anthem.post_boosts SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND end_at <= now();
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_post_boosts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_post_boosts() TO service_role;

-- ---------------------------------------------------------------------------
-- Escrow RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_escrow_from_quotation(
  _quotation_id uuid,
  _amount_thb integer DEFAULT NULL
)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _q record;
  _fee_pct numeric;
  _fee integer;
  _net integer;
  _amt integer;
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  PERFORM public.assert_connect_payouts_ready(_uid);

  SELECT id, user_id, project_name, client_name, client_email
    INTO _q
    FROM public.quotations
   WHERE id = _quotation_id AND user_id = _uid;

  IF NOT FOUND THEN RAISE EXCEPTION 'QUOTATION_NOT_FOUND'; END IF;

  _amt := COALESCE(_amount_thb, 0);
  IF _amt <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  _fee_pct := public.escrow_platform_fee_pct(_uid);
  _fee := ROUND(_amt * _fee_pct);
  _net := _amt - _fee;

  INSERT INTO shared.marketplace_escrows (
    freelancer_user_id, quotation_id, client_name, client_email, title,
    amount_thb, platform_fee_pct, platform_fee_thb, net_payout_thb, status
  ) VALUES (
    _uid, _quotation_id,
    COALESCE(_q.client_name, ''),
    COALESCE(_q.client_email, ''),
    COALESCE(_q.project_name, 'งานฟรีแลนซ์'),
    _amt, _fee_pct, _fee, _net,
    'pending_payment'
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_escrow_from_quotation(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_escrow_from_quotation(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_escrow_from_quotation(uuid, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.create_escrow_from_hire(_hiring_request_id uuid)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _h record;
  _fee_pct numeric;
  _fee integer;
  _amt integer;
  _net integer;
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  PERFORM public.assert_connect_payouts_ready(_uid);

  SELECT id, freelancer_id, client_name, email, project_title, budget_amount
    INTO _h
    FROM anthem.hiring_requests
   WHERE id = _hiring_request_id AND freelancer_id = _uid;

  IF NOT FOUND THEN RAISE EXCEPTION 'HIRE_NOT_FOUND'; END IF;
  _amt := COALESCE(ROUND(_h.budget_amount)::integer, 0);
  IF _amt <= 0 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;

  _fee_pct := public.escrow_platform_fee_pct(_uid);
  _fee := ROUND(_amt * _fee_pct);
  _net := _amt - _fee;

  INSERT INTO shared.marketplace_escrows (
    freelancer_user_id, hiring_request_id, client_name, client_email, title,
    amount_thb, platform_fee_pct, platform_fee_thb, net_payout_thb, status
  ) VALUES (
    _uid, _hiring_request_id,
    COALESCE(_h.client_name, ''),
    COALESCE(_h.email, ''),
    COALESCE(_h.project_title, 'งานจ้าง'),
    _amt, _fee_pct, _fee, _net,
    'pending_payment'
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_escrow_from_hire(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_escrow_from_hire(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_escrow_from_hire(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_escrow_by_portal_token(_portal_token uuid)
RETURNS shared.marketplace_escrows
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared
AS $$
  SELECT * FROM shared.marketplace_escrows WHERE portal_token = _portal_token LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_escrow_by_portal_token(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fulfill_escrow_payment_stripe(
  _stripe_session_id text,
  _escrow_id uuid,
  _payment_intent_id text DEFAULT NULL,
  _environment text DEFAULT 'sandbox'
)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  IF _environment NOT IN ('sandbox', 'live') THEN RAISE EXCEPTION 'INVALID_ENVIRONMENT'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.stripe_checkout_fulfillments WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT * INTO _row FROM shared.marketplace_escrows WHERE id = _escrow_id;
    RETURN _row;
  END IF;

  SELECT * INTO _row FROM shared.marketplace_escrows WHERE id = _escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _row.status NOT IN ('pending_payment', 'draft') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  INSERT INTO public.stripe_checkout_fulfillments (
    stripe_session_id, user_id, kind, price_id, quantity, environment
  ) VALUES (
    _stripe_session_id, _row.freelancer_user_id, 'escrow', 'escrow_deposit', 1, _environment
  );

  UPDATE shared.marketplace_escrows SET
    status = 'funded',
    stripe_checkout_session_id = _stripe_session_id,
    stripe_payment_intent_id = COALESCE(_payment_intent_id, stripe_payment_intent_id),
    funded_at = now(),
    updated_at = now()
  WHERE id = _escrow_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_escrow_payment_stripe(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_escrow_payment_stripe(text, uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.client_approve_escrow(_portal_token uuid)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared
AS $$
DECLARE
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM shared.marketplace_escrows
  WHERE portal_token = _portal_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _row.status NOT IN ('funded', 'in_progress') THEN RAISE EXCEPTION 'INVALID_STATUS'; END IF;

  UPDATE shared.marketplace_escrows SET
    status = 'pending_release',
    approved_at = now(),
    updated_at = now()
  WHERE id = _row.id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_approve_escrow(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.client_dispute_escrow(_portal_token uuid, _reason text DEFAULT '')
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared
AS $$
DECLARE
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  SELECT * INTO _row FROM shared.marketplace_escrows
  WHERE portal_token = _portal_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF _row.status NOT IN ('funded', 'in_progress', 'pending_release') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  UPDATE shared.marketplace_escrows SET
    status = 'disputed',
    disputed_at = now(),
    dispute_reason = LEFT(COALESCE(_reason, ''), 2000),
    updated_at = now()
  WHERE id = _row.id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.client_dispute_escrow(uuid, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_dispute_escrow(
  _escrow_id uuid,
  _action text,
  _note text DEFAULT ''
)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _action NOT IN ('release', 'refund', 'reopen') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;

  SELECT * INTO _row FROM shared.marketplace_escrows WHERE id = _escrow_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF _action = 'release' THEN
    UPDATE shared.marketplace_escrows SET
      status = 'pending_release',
      admin_note = LEFT(COALESCE(_note, ''), 2000),
      updated_at = now()
    WHERE id = _escrow_id RETURNING * INTO _row;
  ELSIF _action = 'refund' THEN
    UPDATE shared.marketplace_escrows SET
      status = 'refunded',
      admin_note = LEFT(COALESCE(_note, ''), 2000),
      updated_at = now()
    WHERE id = _escrow_id RETURNING * INTO _row;
  ELSE
    UPDATE shared.marketplace_escrows SET
      status = 'in_progress',
      admin_note = LEFT(COALESCE(_note, ''), 2000),
      disputed_at = NULL,
      dispute_reason = NULL,
      updated_at = now()
    WHERE id = _escrow_id RETURNING * INTO _row;
  END IF;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dispute_escrow(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dispute_escrow(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dispute_escrow(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_escrow_released_stripe(
  _escrow_id uuid,
  _transfer_id text
)
RETURNS shared.marketplace_escrows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared
AS $$
DECLARE
  _row shared.marketplace_escrows%ROWTYPE;
BEGIN
  UPDATE shared.marketplace_escrows SET
    status = 'released',
    stripe_transfer_id = _transfer_id,
    released_at = now(),
    updated_at = now()
  WHERE id = _escrow_id AND status = 'pending_release'
  RETURNING * INTO _row;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND_OR_INVALID_STATUS'; END IF;
  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_escrow_released_stripe(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_escrow_released_stripe(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.list_my_escrows()
RETURNS SETOF shared.marketplace_escrows
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared
AS $$
  SELECT * FROM shared.marketplace_escrows
  WHERE freelancer_user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_escrows() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_escrows(_limit integer DEFAULT 50)
RETURNS SETOF shared.marketplace_escrows
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN QUERY
  SELECT * FROM shared.marketplace_escrows
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_escrows(integer) TO authenticated;
