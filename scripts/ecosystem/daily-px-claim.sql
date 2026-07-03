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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM shared.daily_px_claims
    WHERE user_id = _uid AND claim_date = _today
  ) INTO _claimed;

  IF _claimed THEN
    _streak := public.daily_px_streak(_uid, _today);
  ELSE
    _streak := public.daily_px_streak(_uid, _today - 1);
  END IF;

  RETURN jsonb_build_object(
    'claim_date', _today,
    'claimed_today', _claimed,
    'reward_px', 1,
    'streak', _streak
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

  UPDATE shared.wallets SET
    welcome_px = welcome_px + _reward,
    updated_at = now()
  WHERE user_id = _uid;

  INSERT INTO shared.daily_px_claims (user_id, claim_date, reward_px)
  VALUES (_uid, _today, _reward);

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
