-- Support Us: shop orders, donation pledges, and a LINE admin-group alert for every sponsor message,
-- order and donation (existing outbox -> line-admin-notify path, sent at once).
--
-- Money never moves here: an order or a pledge is a record the team follows up on (pay by transfer).
-- Real orders / donations are refused until the owner opens them in anthem.support_settings.
-- Test rows (is_test) are always accepted so the flow can be tried end to end; they are labelled in LINE.
-- The owner applies this by hand, and deploys the `line-admin-notify` function with the new cards.

-- ---------------------------------------------------------------------------
-- Switches (one row)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anthem.support_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  shop_open boolean NOT NULL DEFAULT false,
  donate_open boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO anthem.support_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE anthem.support_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON anthem.support_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON anthem.support_settings TO authenticated;
GRANT ALL ON anthem.support_settings TO service_role;

DROP POLICY IF EXISTS support_settings_admin_read ON anthem.support_settings;
CREATE POLICY support_settings_admin_read ON anthem.support_settings
  FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()), 'admin'));
DROP POLICY IF EXISTS support_settings_admin_update ON anthem.support_settings;
CREATE POLICY support_settings_admin_update ON anthem.support_settings
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

-- ---------------------------------------------------------------------------
-- Sponsor messages: mark the ones sent from test mode
-- ---------------------------------------------------------------------------
ALTER TABLE anthem.sponsor_inquiries ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS anthem.submit_sponsor_inquiry(text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION anthem.submit_sponsor_inquiry(
  _company text,
  _contact text,
  _email text,
  _line_id text,
  _interest text,
  _budget text,
  _message text,
  _is_test boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $function$
DECLARE
  v_company text := left(btrim(COALESCE(_company, '')), 120);
  v_contact text := left(btrim(COALESCE(_contact, '')), 100);
  v_email text := lower(btrim(COALESCE(_email, '')));
  v_line text := left(btrim(COALESCE(_line_id, '')), 60);
  v_interest text := COALESCE(_interest, '');
  v_budget text := COALESCE(_budget, '');
  v_message text := left(btrim(COALESCE(_message, '')), 1000);
  v_ref text;
BEGIN
  IF v_company = '' OR v_contact = '' THEN
    RAISE EXCEPTION 'INVALID: company and contact are required';
  END IF;
  IF length(v_email) > 254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' THEN
    RAISE EXCEPTION 'INVALID: email';
  END IF;
  IF v_interest NOT IN ('platform', 'first_connect', 'in_kind', 'invite_us', 'event', 'unsure') THEN
    v_interest := 'unsure';
  END IF;
  IF v_budget NOT IN ('undecided', 'under_5k', '5k_10k', '10k_30k', 'over_30k', 'in_kind') THEN
    v_budget := 'undecided';
  END IF;

  -- No login here, so the limits are per email address and for the whole form.
  IF (SELECT count(*) FROM anthem.sponsor_inquiries
      WHERE email = v_email AND created_at > now() - interval '1 day') >= 3 THEN
    RAISE EXCEPTION 'RATE_LIMIT: too many messages from this email today';
  END IF;
  IF (SELECT count(*) FROM anthem.sponsor_inquiries
      WHERE created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'RATE_LIMIT: too many messages right now';
  END IF;

  v_ref := 'SP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO anthem.sponsor_inquiries (ref, company, contact, email, line_id, interest, budget, message, user_id, is_test)
  VALUES (v_ref, v_company, v_contact, v_email, v_line, v_interest, v_budget, v_message, auth.uid(), COALESCE(_is_test, false));

  RETURN v_ref;
END;
$function$;

REVOKE ALL ON FUNCTION anthem.submit_sponsor_inquiry(text, text, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.submit_sponsor_inquiry(text, text, text, text, text, text, text, boolean) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Shop orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anthem.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'paid', 'shipped', 'cancelled')),
  is_test boolean NOT NULL DEFAULT false,
  -- [{slug, name, variant, qty, unit_thb}] exactly as the buyer saw it.
  items jsonb NOT NULL,
  item_count integer NOT NULL,
  subtotal_thb integer NOT NULL,
  shipping_thb integer NOT NULL,
  total_thb integer NOT NULL,
  buyer_name text NOT NULL,
  buyer_phone text NOT NULL,
  buyer_contact text NOT NULL DEFAULT '',
  ship_address text NOT NULL,
  note text NOT NULL DEFAULT '',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shop_orders_created_idx ON anthem.shop_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS shop_orders_phone_idx ON anthem.shop_orders (buyer_phone, created_at DESC);

ALTER TABLE anthem.shop_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON anthem.shop_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON anthem.shop_orders TO authenticated;
GRANT ALL ON anthem.shop_orders TO service_role;

DROP POLICY IF EXISTS shop_orders_admin_read ON anthem.shop_orders;
CREATE POLICY shop_orders_admin_read ON anthem.shop_orders
  FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()), 'admin'));
DROP POLICY IF EXISTS shop_orders_admin_update ON anthem.shop_orders;
CREATE POLICY shop_orders_admin_update ON anthem.shop_orders
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

-- Amounts are stored as the buyer saw them (the price list lives in the web app for now).
-- The team checks them against the price list before confirming a transfer.
CREATE OR REPLACE FUNCTION anthem.place_shop_order(
  _items jsonb,
  _shipping_thb integer,
  _buyer_name text,
  _buyer_phone text,
  _buyer_contact text,
  _ship_address text,
  _note text,
  _is_test boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $function$
DECLARE
  v_test boolean := COALESCE(_is_test, false);
  v_name text := left(btrim(COALESCE(_buyer_name, '')), 100);
  v_phone text := left(btrim(COALESCE(_buyer_phone, '')), 20);
  v_contact text := left(btrim(COALESCE(_buyer_contact, '')), 120);
  v_address text := left(btrim(COALESCE(_ship_address, '')), 500);
  v_note text := left(btrim(COALESCE(_note, '')), 300);
  v_shipping integer := COALESCE(_shipping_thb, 0);
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_qty integer;
  v_unit integer;
  v_count integer := 0;
  v_subtotal integer := 0;
  v_ref text;
BEGIN
  IF NOT v_test AND NOT COALESCE((SELECT shop_open FROM anthem.support_settings WHERE id), false) THEN
    RAISE EXCEPTION 'CLOSED: the shop is not open yet';
  END IF;
  IF v_name = '' OR length(v_address) < 10 THEN
    RAISE EXCEPTION 'INVALID: name and address are required';
  END IF;
  IF v_phone !~ '^[0-9+][0-9 -]{7,18}$' THEN
    RAISE EXCEPTION 'INVALID: phone';
  END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array'
     OR jsonb_array_length(_items) < 1 OR jsonb_array_length(_items) > 20 THEN
    RAISE EXCEPTION 'INVALID: items';
  END IF;
  IF v_shipping < 0 OR v_shipping > 1000 THEN
    RAISE EXCEPTION 'INVALID: shipping';
  END IF;

  FOR v_item IN SELECT jsonb_array_elements(_items)
  LOOP
    IF COALESCE(v_item->>'slug', '') !~ '^[a-z0-9-]{1,60}$'
       OR COALESCE(v_item->>'qty', '') !~ '^[0-9]{1,2}$'
       OR COALESCE(v_item->>'unit_thb', '') !~ '^[0-9]{1,6}$' THEN
      RAISE EXCEPTION 'INVALID: item';
    END IF;
    v_qty := (v_item->>'qty')::integer;
    v_unit := (v_item->>'unit_thb')::integer;
    IF v_qty < 1 OR v_qty > 5 OR v_unit < 1 THEN
      RAISE EXCEPTION 'INVALID: item amount';
    END IF;
    v_count := v_count + v_qty;
    v_subtotal := v_subtotal + v_qty * v_unit;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'slug', v_item->>'slug',
      'name', left(btrim(COALESCE(v_item->>'name', v_item->>'slug')), 80),
      'variant', left(btrim(COALESCE(v_item->>'variant', '')), 60),
      'qty', v_qty,
      'unit_thb', v_unit
    ));
  END LOOP;

  -- No login here: limit per phone number and for the whole shop.
  IF (SELECT count(*) FROM anthem.shop_orders
      WHERE buyer_phone = v_phone AND created_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT: too many orders from this number today';
  END IF;
  IF (SELECT count(*) FROM anthem.shop_orders
      WHERE created_at > now() - interval '1 day') >= 60 THEN
    RAISE EXCEPTION 'RATE_LIMIT: too many orders right now';
  END IF;

  v_ref := 'SO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO anthem.shop_orders (ref, is_test, items, item_count, subtotal_thb, shipping_thb, total_thb,
                                  buyer_name, buyer_phone, buyer_contact, ship_address, note, user_id)
  VALUES (v_ref, v_test, v_items, v_count, v_subtotal, v_shipping, v_subtotal + v_shipping,
          v_name, v_phone, v_contact, v_address, v_note, auth.uid());

  RETURN v_ref;
END;
$function$;

REVOKE ALL ON FUNCTION anthem.place_shop_order(jsonb, integer, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.place_shop_order(jsonb, integer, text, text, text, text, text, boolean) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Donation pledges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anthem.donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pledged' CHECK (status IN ('pledged', 'received', 'cancelled')),
  is_test boolean NOT NULL DEFAULT false,
  amount_thb integer NOT NULL CHECK (amount_thb BETWEEN 20 AND 50000),
  show_name boolean NOT NULL DEFAULT false,
  display_name text NOT NULL DEFAULT '',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS donations_created_idx ON anthem.donations (created_at DESC);

ALTER TABLE anthem.donations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON anthem.donations FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON anthem.donations TO authenticated;
GRANT ALL ON anthem.donations TO service_role;

DROP POLICY IF EXISTS donations_admin_read ON anthem.donations;
CREATE POLICY donations_admin_read ON anthem.donations
  FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()), 'admin'));
DROP POLICY IF EXISTS donations_admin_update ON anthem.donations;
CREATE POLICY donations_admin_update ON anthem.donations
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));

CREATE OR REPLACE FUNCTION anthem.pledge_donation(
  _amount_thb integer,
  _show_name boolean,
  _display_name text,
  _is_test boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $function$
DECLARE
  v_test boolean := COALESCE(_is_test, false);
  v_show boolean := COALESCE(_show_name, false);
  v_name text := left(btrim(COALESCE(_display_name, '')), 60);
  v_ref text;
BEGIN
  IF NOT v_test AND NOT COALESCE((SELECT donate_open FROM anthem.support_settings WHERE id), false) THEN
    RAISE EXCEPTION 'CLOSED: donations are not open yet';
  END IF;
  IF _amount_thb IS NULL OR _amount_thb < 20 OR _amount_thb > 50000 THEN
    RAISE EXCEPTION 'INVALID: amount';
  END IF;
  IF (SELECT count(*) FROM anthem.donations WHERE created_at > now() - interval '1 day') >= 60 THEN
    RAISE EXCEPTION 'RATE_LIMIT: too many pledges right now';
  END IF;

  v_ref := 'DN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO anthem.donations (ref, is_test, amount_thb, show_name, display_name, user_id)
  VALUES (v_ref, v_test, _amount_thb, v_show, CASE WHEN v_show THEN v_name ELSE '' END, auth.uid());

  RETURN v_ref;
END;
$function$;

REVOKE ALL ON FUNCTION anthem.pledge_donation(integer, boolean, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.pledge_donation(integer, boolean, text, boolean) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- LINE admin group alerts
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_line_outbox DROP CONSTRAINT IF EXISTS admin_line_outbox_kind_check;
ALTER TABLE public.admin_line_outbox ADD CONSTRAINT admin_line_outbox_kind_check
  CHECK (kind = ANY (ARRAY['member', 'feedback', 'report', 'digest', 'event', 'trend', 'creator_invite',
                           'sponsor', 'shop_order', 'donation']));

CREATE OR REPLACE FUNCTION public.admin_line_sponsor_info(_id uuid)
RETURNS TABLE (ref text, company text, contact text, email text, line_id text, interest text, budget text,
               message text, is_test boolean, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
  SELECT s.ref, s.company, s.contact, s.email, s.line_id, s.interest, s.budget, s.message, s.is_test, s.created_at
    FROM anthem.sponsor_inquiries s
   WHERE s.id = _id;
$$;
REVOKE ALL ON FUNCTION public.admin_line_sponsor_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_sponsor_info(uuid) TO service_role;

-- The shipping address stays in the database: the alert carries only what is needed to call the buyer back.
CREATE OR REPLACE FUNCTION public.admin_line_shop_order_info(_id uuid)
RETURNS TABLE (ref text, items jsonb, item_count integer, total_thb integer, shipping_thb integer,
               buyer_name text, buyer_phone text, is_test boolean, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
  SELECT o.ref, o.items, o.item_count, o.total_thb, o.shipping_thb, o.buyer_name, o.buyer_phone, o.is_test, o.created_at
    FROM anthem.shop_orders o
   WHERE o.id = _id;
$$;
REVOKE ALL ON FUNCTION public.admin_line_shop_order_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_shop_order_info(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_line_donation_info(_id uuid)
RETURNS TABLE (ref text, amount_thb integer, show_name boolean, display_name text, is_test boolean,
               created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
  SELECT d.ref, d.amount_thb, d.show_name, d.display_name, d.is_test, d.created_at
    FROM anthem.donations d
   WHERE d.id = _id;
$$;
REVOKE ALL ON FUNCTION public.admin_line_donation_info(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_donation_info(uuid) TO service_role;

-- One trigger function for the three tables; the alert kind comes from the trigger argument.
-- These forms are open to visitors, so alerts stop at 40 a day (rows are still saved): LINE credits are limited.
CREATE OR REPLACE FUNCTION anthem.admin_line_on_support_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.admin_line_outbox
       WHERE kind IN ('sponsor', 'shop_order', 'donation')
         AND created_at > now() - interval '1 day') < 40 THEN
    PERFORM public.admin_line_enqueue(TG_ARGV[0], NEW.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- never block the visitor's submit
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_line_sponsor ON anthem.sponsor_inquiries;
CREATE TRIGGER trg_admin_line_sponsor
  AFTER INSERT ON anthem.sponsor_inquiries
  FOR EACH ROW EXECUTE FUNCTION anthem.admin_line_on_support_insert('sponsor');

DROP TRIGGER IF EXISTS trg_admin_line_shop_order ON anthem.shop_orders;
CREATE TRIGGER trg_admin_line_shop_order
  AFTER INSERT ON anthem.shop_orders
  FOR EACH ROW EXECUTE FUNCTION anthem.admin_line_on_support_insert('shop_order');

DROP TRIGGER IF EXISTS trg_admin_line_donation ON anthem.donations;
CREATE TRIGGER trg_admin_line_donation
  AFTER INSERT ON anthem.donations
  FOR EACH ROW EXECUTE FUNCTION anthem.admin_line_on_support_insert('donation');
