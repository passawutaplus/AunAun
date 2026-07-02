-- Custom Boost packages (min 50 THB, min 1 day) — run on shared Supabase (anthem schema)

ALTER TABLE anthem.post_boosts
  DROP CONSTRAINT IF EXISTS post_boosts_package_check;

ALTER TABLE anthem.post_boosts
  ADD CONSTRAINT post_boosts_package_check
  CHECK (package IN ('micro_3', 'micro_7', 'micro_14', 'micro_custom'));

CREATE OR REPLACE FUNCTION public.create_post_boost_custom(
  _target_type text,
  _target_id uuid,
  _amount_thb integer,
  _duration_days integer
)
RETURNS anthem.post_boosts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row anthem.post_boosts%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF _target_type NOT IN ('project', 'community_post') THEN RAISE EXCEPTION 'INVALID_TARGET_TYPE'; END IF;
  IF _amount_thb IS NULL OR _amount_thb < 50 THEN RAISE EXCEPTION 'MIN_AMOUNT_50'; END IF;
  IF _duration_days IS NULL OR _duration_days < 1 THEN RAISE EXCEPTION 'MIN_DURATION_1'; END IF;
  IF _amount_thb > 50000 THEN RAISE EXCEPTION 'AMOUNT_TOO_HIGH'; END IF;
  IF _duration_days > 90 THEN RAISE EXCEPTION 'DURATION_TOO_LONG'; END IF;

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
    _uid, _target_type, _target_id, 'micro_custom', _amount_thb, _duration_days, 'pending_payment'
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_post_boost_custom(text, uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_post_boost_custom(text, uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_post_boost_custom(text, uuid, integer, integer) TO service_role;

-- Verify paid amount matches row for custom boosts
CREATE OR REPLACE FUNCTION public.activate_post_boost_stripe(
  _stripe_session_id text,
  _boost_id uuid,
  _price_id text DEFAULT 'unknown',
  _environment text DEFAULT 'sandbox',
  _paid_amount_thb integer DEFAULT NULL
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

  IF _row.package = 'micro_custom' THEN
    IF _paid_amount_thb IS NULL OR _paid_amount_thb <> _row.amount_thb THEN
      RAISE EXCEPTION 'PAID_AMOUNT_MISMATCH';
    END IF;
  END IF;

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

REVOKE ALL ON FUNCTION public.activate_post_boost_stripe(text, uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_post_boost_stripe(text, uuid, text, text, integer) TO service_role;

-- Replace 4-arg overload if present
DROP FUNCTION IF EXISTS public.activate_post_boost_stripe(text, uuid, text, text);
