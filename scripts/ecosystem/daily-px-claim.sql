-- Daily 1 px check-in (Bangkok calendar day) — gift-only welcome_px, not counted toward welcome mission cap
-- Apply on unified Supabase project (shared schema)

CREATE TABLE IF NOT EXISTS shared.daily_px_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_date date NOT NULL,
  reward_px integer NOT NULL DEFAULT 1 CHECK (reward_px > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, claim_date)
);

ALTER TABLE shared.daily_px_claims
  ADD COLUMN IF NOT EXISTS wallet_applied boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS daily_px_claims_user_date_idx
  ON shared.daily_px_claims (user_id, claim_date DESC);

ALTER TABLE shared.daily_px_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_px_claims_select_own ON shared.daily_px_claims;
CREATE POLICY daily_px_claims_select_own ON shared.daily_px_claims
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON shared.daily_px_claims FROM anon;
GRANT SELECT ON shared.daily_px_claims TO authenticated;
GRANT ALL ON shared.daily_px_claims TO service_role;

CREATE OR REPLACE FUNCTION public.bangkok_today()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (timezone('Asia/Bangkok', now()))::date;
$$;

CREATE OR REPLACE FUNCTION public.daily_px_streak(_uid uuid, _anchor date)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _streak integer := 0;
  _d date := _anchor;
BEGIN
  IF _uid IS NULL OR _anchor IS NULL THEN
    RETURN 0;
  END IF;

  LOOP
    IF EXISTS (
      SELECT 1 FROM shared.daily_px_claims
      WHERE user_id = _uid AND claim_date = _d
    ) THEN
      _streak := _streak + 1;
      _d := _d - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN _streak;
END;
$$;

REVOKE ALL ON FUNCTION public.daily_px_streak(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.daily_px_streak(uuid, date) TO authenticated, service_role;

-- Credit any daily claims recorded before wallet_applied tracking (or partial failures).
CREATE OR REPLACE FUNCTION public.repair_pending_daily_px_credits(_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _claim RECORD;
BEGIN
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  FOR _claim IN
    SELECT id, reward_px
    FROM shared.daily_px_claims
    WHERE user_id = _uid AND wallet_applied = false
    ORDER BY claim_date ASC
    FOR UPDATE
  LOOP
    INSERT INTO shared.wallets (user_id) VALUES (_uid)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE shared.wallets SET
      welcome_px = welcome_px + _claim.reward_px,
      updated_at = now()
    WHERE user_id = _uid;

    UPDATE shared.daily_px_claims
    SET wallet_applied = true
    WHERE id = _claim.id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.repair_pending_daily_px_credits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.repair_pending_daily_px_credits(uuid) TO authenticated, service_role;

-- One-time style repair: claimed today but wallet still empty and nothing was ever spent.
CREATE OR REPLACE FUNCTION public.repair_stale_daily_px_today(_uid uuid, _today date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _reward integer;
  _wallet shared.wallets%ROWTYPE;
BEGIN
  IF _uid IS NULL OR _today IS NULL THEN
    RETURN;
  END IF;

  SELECT reward_px INTO _reward
  FROM shared.daily_px_claims
  WHERE user_id = _uid AND claim_date = _today;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO shared.wallets (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _wallet FROM shared.wallets WHERE user_id = _uid FOR UPDATE;

  IF COALESCE(_wallet.welcome_px, 0) + COALESCE(_wallet.purchased_px, 0) > 0 THEN
    RETURN;
  END IF;

  IF COALESCE(_wallet.lifetime_spent_px, 0) > 0
     OR COALESCE(_wallet.lifetime_earned_px, 0) > 0 THEN
    RETURN;
  END IF;

  UPDATE shared.wallets SET
    welcome_px = welcome_px + _reward,
    updated_at = now()
  WHERE user_id = _uid;

  UPDATE shared.daily_px_claims
  SET wallet_applied = true
  WHERE user_id = _uid AND claim_date = _today;
END;
$$;

REVOKE ALL ON FUNCTION public.repair_stale_daily_px_today(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.repair_stale_daily_px_today(uuid, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_wallet()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _wallet shared.wallets%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  PERFORM public.repair_pending_daily_px_credits(_uid);
  PERFORM public.repair_stale_daily_px_today(_uid, public.bangkok_today());

  SELECT * INTO _wallet FROM shared.wallets WHERE user_id = _uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'user_id', _uid,
      'balance_px', 0,
      'purchased_px', 0,
      'earned_px', 0,
      'welcome_px', 0,
      'lifetime_welcome_px', 0,
      'lifetime_earned_px', 0,
      'lifetime_spent_px', 0,
      'updated_at', now()
    );
  END IF;

  RETURN jsonb_build_object(
    'user_id', _wallet.user_id,
    'balance_px', COALESCE(_wallet.balance_px, 0),
    'purchased_px', COALESCE(_wallet.purchased_px, 0),
    'earned_px', COALESCE(_wallet.earned_px, 0),
    'welcome_px', COALESCE(_wallet.welcome_px, 0),
    'lifetime_welcome_px', COALESCE(_wallet.lifetime_welcome_px, 0),
    'lifetime_earned_px', COALESCE(_wallet.lifetime_earned_px, 0),
    'lifetime_spent_px', COALESCE(_wallet.lifetime_spent_px, 0),
    'updated_at', _wallet.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_wallet() TO authenticated;

CREATE OR REPLACE FUNCTION public.daily_px_claim_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := public.bangkok_today();
  _claimed boolean;
  _streak integer;
  _wallet shared.wallets%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM shared.daily_px_claims
    WHERE user_id = _uid AND claim_date = _today
  ) INTO _claimed;

  IF _claimed THEN
    PERFORM public.repair_pending_daily_px_credits(_uid);
    PERFORM public.repair_stale_daily_px_today(_uid, _today);
    _streak := public.daily_px_streak(_uid, _today);
  ELSE
    _streak := public.daily_px_streak(_uid, _today - 1);
  END IF;

  SELECT * INTO _wallet FROM shared.wallets WHERE user_id = _uid;

  RETURN jsonb_build_object(
    'claim_date', _today,
    'claimed_today', _claimed,
    'reward_px', 1,
    'streak', _streak,
    'welcome_px', COALESCE(_wallet.welcome_px, 0),
    'purchased_px', COALESCE(_wallet.purchased_px, 0),
    'balance_px', COALESCE(_wallet.balance_px, 0),
    'giftable_px', COALESCE(_wallet.welcome_px, 0) + COALESCE(_wallet.purchased_px, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.daily_px_claim_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_daily_px()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := public.bangkok_today();
  _reward integer := 1;
  _wallet shared.wallets%ROWTYPE;
  _streak integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM shared.daily_px_claims
    WHERE user_id = _uid AND claim_date = _today
  ) THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED_TODAY';
  END IF;

  INSERT INTO shared.wallets (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _wallet FROM shared.wallets WHERE user_id = _uid FOR UPDATE;

  INSERT INTO shared.daily_px_claims (user_id, claim_date, reward_px, wallet_applied)
  VALUES (_uid, _today, _reward, false);

  UPDATE shared.wallets SET
    welcome_px = welcome_px + _reward,
    updated_at = now()
  WHERE user_id = _uid;

  UPDATE shared.daily_px_claims
  SET wallet_applied = true
  WHERE user_id = _uid AND claim_date = _today;

  _streak := public.daily_px_streak(_uid, _today);

  SELECT * INTO _wallet FROM shared.wallets WHERE user_id = _uid;

  RETURN jsonb_build_object(
    'claim_date', _today,
    'reward_px', _reward,
    'claimed_today', true,
    'streak', _streak,
    'welcome_px', _wallet.welcome_px,
    'balance_px', _wallet.balance_px
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_px() TO authenticated;

-- Giftable balance for UI (welcome + purchased; daily check-in credits welcome_px)
CREATE OR REPLACE FUNCTION public.available_gift_px(_uid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
  SELECT COALESCE(
    (SELECT welcome_px + purchased_px FROM shared.wallets WHERE user_id = _uid),
    0
  );
$$;

GRANT EXECUTE ON FUNCTION public.available_gift_px(uuid) TO authenticated, service_role;
