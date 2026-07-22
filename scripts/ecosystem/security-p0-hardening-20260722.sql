-- Security P0 hardening (2026-07-22)

DROP TRIGGER IF EXISTS profiles_auto_grant_admin ON public.profiles;
DROP FUNCTION IF EXISTS public.auto_grant_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.force_purge_user(
  _target_user_id uuid,
  _admin_user_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(user_id uuid, warnings text[], auth_deleted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'storage', 'pg_catalog'
AS $function$
DECLARE
  effective_admin uuid;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Access denied: service_role only';
  END IF;

  effective_admin := _admin_user_id;
  IF effective_admin IS NULL OR NOT public.has_role(effective_admin, 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin actor required';
  END IF;

  IF _target_user_id = effective_admin THEN
    RAISE EXCEPTION 'Cannot purge yourself';
  END IF;

  UPDATE public.profiles
     SET is_active = false,
         tester_approved = false,
         deactivated_at = COALESCE(deactivated_at, now()),
         deactivated_by = effective_admin,
         purge_after = now() - interval '1 second',
         updated_at = now()
   WHERE profiles.user_id = _target_user_id;

  RETURN QUERY SELECT * FROM public.purge_inactive_profile_data(1);
END;
$function$;

REVOKE ALL ON FUNCTION public.force_purge_user(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.force_purge_user(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.available_purchased_px(_uid uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role'
     AND auth.uid() IS DISTINCT FROM _uid
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN COALESCE((SELECT purchased_px FROM shared.wallets WHERE user_id = _uid), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.available_gift_px(_uid uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role'
     AND auth.uid() IS DISTINCT FROM _uid
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN COALESCE((SELECT welcome_px + purchased_px FROM shared.wallets WHERE user_id = _uid), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.available_purchased_px(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.available_gift_px(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.available_purchased_px(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.available_gift_px(uuid) TO authenticated, service_role;

REVOKE ALL ON public.profiles FROM authenticated;
GRANT SELECT (
  user_id, id, display_name, username, avatar_url, bio, role, skills, experience,
  website, instagram, facebook, line_id, cover_url, is_verified, location,
  opportunity_status, opportunity_types, opportunity_note, open_for_work,
  open_for_work_badge, preferred_categories, availability_status,
  hourly_rate_min, daily_rate_min, project_rate_note, created_at, updated_at
) ON public.profiles TO authenticated;
-- PII not granted for SELECT (would leak via profiles_select_public_active).
-- Own sensitive fields via get_my_profile_sensitive().

CREATE OR REPLACE FUNCTION public.get_my_profile_sensitive()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  prow public.profiles%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT * INTO prow FROM public.profiles WHERE user_id = uid OR id = uid LIMIT 1;
  IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  RETURN jsonb_build_object(
    'email', prow.email,
    'phone', prow.phone,
    'tax_id', prow.tax_id,
    'bank_account_number', prow.bank_account_number,
    'payment_qr_url', prow.payment_qr_url,
    'stripe_connect_account_id', prow.stripe_connect_account_id,
    'address', prow.address,
    'account_status', prow.account_status,
    'is_active', prow.is_active
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_profile_sensitive() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_sensitive() TO authenticated;

GRANT INSERT (
  id, user_id, email, display_name, username, avatar_url, cover_url, created_at, updated_at,
  feed_interests, skills, preferred_categories, opportunity_types
) ON public.profiles TO authenticated;

GRANT UPDATE (
  tax_id, address, phone, bank_account_number, payment_qr_url
) ON public.profiles TO authenticated;
GRANT UPDATE (
  display_name, username, avatar_url, bio, role, skills, experience, website,
  instagram, facebook, line_id, cover_url, location, opportunity_status,
  opportunity_types, opportunity_note, open_for_work, open_for_work_badge,
  preferred_categories, availability_status, hourly_rate_min, daily_rate_min,
  project_rate_note, onboarding_visits, feed_interests, feed_interests_at,
  profile_onboarding_at, updated_at
) ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- hire_orders guard + confirm RPC

CREATE OR REPLACE FUNCTION shared.enforce_hire_order_money_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  q_amount bigint;
BEGIN
  IF coalesce(auth.role(), '') = 'service_role'
     OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'))
     OR current_setting('aplus1.allow_hire_paid', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS NULL OR NEW.status NOT IN ('draft', 'awaiting_payment') THEN
      RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_STATUS';
    END IF;
    NEW.paid_at := NULL;
    NEW.amount_paid_satang := 0;
    IF NEW.quote_id IS NOT NULL THEN
      SELECT amount_satang INTO q_amount FROM shared.hire_quotes WHERE id = NEW.quote_id;
      IF q_amount IS NOT NULL AND q_amount > 0 THEN
        NEW.job_price_satang := q_amount;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.job_price_satang IS DISTINCT FROM OLD.job_price_satang
     OR NEW.buyer_pays_satang IS DISTINCT FROM OLD.buyer_pays_satang
     OR NEW.seller_net_satang IS DISTINCT FROM OLD.seller_net_satang
     OR NEW.platform_fee_satang IS DISTINCT FROM OLD.platform_fee_satang
     OR NEW.card_surcharge_satang IS DISTINCT FROM OLD.card_surcharge_satang
     OR NEW.amount_paid_satang IS DISTINCT FROM OLD.amount_paid_satang
     OR NEW.balance_due_satang IS DISTINCT FROM OLD.balance_due_satang
     OR NEW.wht_satang IS DISTINCT FROM OLD.wht_satang
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
  THEN
    RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_MONEY';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('paid_pending', 'deposit_paid')
     AND OLD.status NOT IN ('paid_pending', 'deposit_paid') THEN
    RAISE EXCEPTION 'FORBIDDEN_HIRE_ORDER_PAID_STATUS';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hire_orders_money_guard ON shared.hire_orders;
CREATE TRIGGER hire_orders_money_guard
  BEFORE INSERT OR UPDATE ON shared.hire_orders
  FOR EACH ROW
  EXECUTE FUNCTION shared.enforce_hire_order_money_guard();

CREATE OR REPLACE FUNCTION shared.confirm_hire_order_payment(
  _order_id uuid,
  _charge_id text,
  _paid_status text DEFAULT 'paid_pending'
)
RETURNS shared.hire_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  o shared.hire_orders;
  uid uuid := auth.uid();
  st text := coalesce(nullif(trim(_paid_status), ''), 'paid_pending');
BEGIN
  IF _order_id IS NULL OR coalesce(trim(_charge_id), '') = '' THEN
    RAISE EXCEPTION 'INVALID_ARGS';
  END IF;
  IF st NOT IN ('paid_pending', 'deposit_paid') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT * INTO o FROM shared.hire_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;

  IF coalesce(auth.role(), '') = 'service_role' THEN
    NULL;
  ELSIF uid IS NOT NULL AND uid = o.buyer_id THEN
    IF _charge_id NOT LIKE 'mock_%' THEN
      RAISE EXCEPTION 'CLIENT_CONFIRM_MOCK_ONLY';
    END IF;
    IF NOT COALESCE((SELECT mock_topup_enabled FROM public.payment_settings WHERE id = 1), false) THEN
      RAISE EXCEPTION 'MOCK_PAY_DISABLED';
    END IF;
  ELSE
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF o.status NOT IN ('draft', 'awaiting_payment', 'deposit_paid') THEN
    RETURN o;
  END IF;

  PERFORM set_config('aplus1.allow_hire_paid', '1', true);

  UPDATE shared.hire_orders
  SET
    status = st,
    paid_at = coalesce(paid_at, now()),
    amount_paid_satang = CASE
      WHEN amount_paid_satang IS NULL OR amount_paid_satang = 0 THEN buyer_pays_satang
      ELSE amount_paid_satang
    END,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('charge_id', _charge_id),
    updated_at = now()
  WHERE id = _order_id
  RETURNING * INTO o;

  RETURN o;
END;
$$;

REVOKE ALL ON FUNCTION shared.confirm_hire_order_payment(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shared.confirm_hire_order_payment(uuid, text, text) TO authenticated, service_role;

-- send_gift: welcome stays non-cashoutable on recipient

CREATE OR REPLACE FUNCTION public.send_gift(
  _recipient_id uuid,
  _gift_id uuid,
  _message text DEFAULT '',
  _project_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared
AS $$
DECLARE
  uid uuid := auth.uid();
  price integer;
  w record;
  from_welcome integer;
  from_purchased integer;
  tx_id uuid;
  gift_active boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF _recipient_id IS NULL OR _recipient_id = uid THEN
    RAISE EXCEPTION 'INVALID_RECIPIENT';
  END IF;

  SELECT g.price_px, coalesce(g.active, true)
    INTO price, gift_active
  FROM shared.gifts g
  WHERE g.id = _gift_id;

  IF price IS NULL OR price <= 0 OR gift_active IS NOT TRUE THEN
    RAISE EXCEPTION 'INVALID_GIFT';
  END IF;

  INSERT INTO shared.wallets (user_id) VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO shared.wallets (user_id) VALUES (_recipient_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO w FROM shared.wallets WHERE user_id = uid FOR UPDATE;
  IF COALESCE(w.welcome_px, 0) + COALESCE(w.purchased_px, 0) < price THEN
    RAISE EXCEPTION 'INSUFFICIENT_PX';
  END IF;

  from_welcome := LEAST(COALESCE(w.welcome_px, 0), price);
  from_purchased := price - from_welcome;

  UPDATE shared.wallets
  SET welcome_px = welcome_px - from_welcome,
      purchased_px = purchased_px - from_purchased,
      lifetime_spent_px = COALESCE(lifetime_spent_px, 0) + price,
      updated_at = now()
  WHERE user_id = uid;

  UPDATE shared.wallets
  SET welcome_px = welcome_px + from_welcome,
      earned_px = earned_px + from_purchased,
      lifetime_earned_px = COALESCE(lifetime_earned_px, 0) + from_purchased,
      updated_at = now()
  WHERE user_id = _recipient_id;

  INSERT INTO shared.gift_transactions (
    sender_id, recipient_id, gift_id, price_px, message, project_id
  ) VALUES (
    uid, _recipient_id, _gift_id, price, COALESCE(_message, ''), _project_id
  )
  RETURNING id INTO tx_id;

  RETURN tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_gift(uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_gift(uuid, uuid, text, uuid) TO authenticated, service_role;
