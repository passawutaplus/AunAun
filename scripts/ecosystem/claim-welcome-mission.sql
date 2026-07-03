-- claim_welcome_mission for production (public.welcome_mission_claims + shared.wallets)
-- Uses existing _check_welcome_mission() and welcome_mission_catalog rewards

CREATE OR REPLACE FUNCTION public.claim_welcome_mission(_mission_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _reward integer;
  _cap integer;
  _wallet shared.wallets%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF NOT public._check_welcome_mission(_uid, _mission_id) THEN
    RAISE EXCEPTION 'NOT_COMPLETE:%', _mission_id;
  END IF;

  SELECT reward_px INTO _reward
  FROM public.welcome_mission_catalog
  WHERE id = _mission_id AND active = true;

  IF _reward IS NULL OR _reward <= 0 THEN
    RAISE EXCEPTION 'INVALID:%', _mission_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.welcome_mission_claims
    WHERE user_id = _uid AND mission_id = _mission_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_CLAIMED:%', _mission_id;
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

  IF _reward <= 0 THEN
    RAISE EXCEPTION 'WELCOME_CAP_REACHED';
  END IF;

  UPDATE shared.wallets SET
    welcome_px = welcome_px + _reward,
    lifetime_welcome_px = lifetime_welcome_px + _reward,
    updated_at = now()
  WHERE user_id = _uid;

  INSERT INTO public.welcome_mission_claims (user_id, mission_id, reward_px)
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

-- RLS: users manage own mission claims (read); writes via RPC only
ALTER TABLE public.welcome_mission_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS welcome_mission_claims_select_own ON public.welcome_mission_claims;
CREATE POLICY welcome_mission_claims_select_own ON public.welcome_mission_claims
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.welcome_mission_claims TO authenticated;
GRANT SELECT ON public.welcome_mission_catalog TO authenticated, anon;
