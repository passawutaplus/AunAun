-- Aplus1 Admin Finance RPCs (Omise + THB ledger)
-- Apply AFTER scripts/ecosystem/aplus1-omise-payments.sql
-- Requires public.is_admin_user()

-- Ensure payment tables exist (no-op if already applied)
-- (caller should apply aplus1-omise-payments.sql first)

CREATE OR REPLACE FUNCTION public._finance_audit(
  _action text,
  _entity_type text,
  _entity_id uuid,
  _detail jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  INSERT INTO shared.payment_audit_logs (actor_id, action, entity_type, entity_id, detail)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, coalesce(_detail, '{}'::jsonb));
END;
$$;

-- ---------------------------------------------------------------------------
-- Overview KPIs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_finance_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  SELECT jsonb_build_object(
    'pending_satang_sum', COALESCE((SELECT SUM(pending_satang) FROM shared.account_balances), 0),
    'available_satang_sum', COALESCE((SELECT SUM(available_satang) FROM shared.account_balances), 0),
    'payout_reserved_satang_sum', COALESCE((SELECT SUM(payout_reserved_satang) FROM shared.account_balances), 0),
    'paid_out_satang_sum', COALESCE((SELECT SUM(paid_out_satang) FROM shared.account_balances), 0),
    'disputed_satang_sum', COALESCE((SELECT SUM(disputed_satang) FROM shared.account_balances), 0),
    'payout_queued_count', (
      SELECT COUNT(*)::int FROM shared.payout_requests
      WHERE status IN ('queued', 'reserved', 'processing')
    ),
    'payout_failed_count', (
      SELECT COUNT(*)::int FROM shared.payout_requests WHERE status = 'failed'
    ),
    'webhook_unprocessed_count', (
      SELECT COUNT(*)::int FROM shared.provider_events
      WHERE processed_at IS NULL OR process_error IS NOT NULL
    ),
    'open_disputes', (
      SELECT COUNT(*)::int FROM shared.payment_disputes WHERE status = 'open'
    ),
    'refunds_pending', (
      SELECT COUNT(*)::int FROM shared.refunds WHERE status = 'pending'
    ),
    'paid_orders_24h', (
      SELECT COUNT(*)::int FROM shared.hire_orders
      WHERE paid_at IS NOT NULL AND paid_at > now() - interval '24 hours'
    ),
    'platform_fee_satang_30d', COALESCE((
      SELECT SUM(platform_fee_satang) FROM shared.hire_orders
      WHERE paid_at IS NOT NULL AND paid_at > now() - interval '30 days'
    ), 0),
    'gmv_paid_satang_30d', COALESCE((
      SELECT SUM(job_price_satang) FROM shared.hire_orders
      WHERE paid_at IS NOT NULL AND paid_at > now() - interval '30 days'
    ), 0),
    'recipients_unverified', (
      SELECT COUNT(*)::int FROM shared.payment_recipients WHERE verified = false
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_finance_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_finance_overview() TO authenticated;

-- ---------------------------------------------------------------------------
-- Lists
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_list_hire_orders(
  _status text DEFAULT NULL,
  _limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  hiring_request_id uuid,
  buyer_id uuid,
  seller_id uuid,
  buyer_name text,
  seller_name text,
  status text,
  job_price_satang bigint,
  buyer_pays_satang bigint,
  seller_net_satang bigint,
  platform_fee_satang bigint,
  platform_fee_percent numeric,
  payment_method text,
  paid_at timestamptz,
  approved_at timestamptz,
  available_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.hiring_request_id,
    o.buyer_id,
    o.seller_id,
    COALESCE(pb.display_name, pb.username, o.buyer_id::text) AS buyer_name,
    COALESCE(ps.display_name, ps.username, o.seller_id::text) AS seller_name,
    o.status,
    o.job_price_satang,
    o.buyer_pays_satang,
    o.seller_net_satang,
    o.platform_fee_satang,
    o.platform_fee_percent,
    o.payment_method,
    o.paid_at,
    o.approved_at,
    o.available_at,
    o.created_at
  FROM shared.hire_orders o
  LEFT JOIN shared.profiles pb ON pb.user_id = o.buyer_id
  LEFT JOIN shared.profiles ps ON ps.user_id = o.seller_id
  WHERE (_status IS NULL OR _status = '' OR o.status = _status)
  ORDER BY o.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_hire_orders(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_hire_orders(text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_payments(
  _status text DEFAULT NULL,
  _limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  hire_order_id uuid,
  provider text,
  provider_charge_id text,
  method text,
  status text,
  amount_satang bigint,
  paid_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz,
  order_status text,
  buyer_id uuid,
  seller_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.hire_order_id,
    p.provider,
    p.provider_charge_id,
    p.method,
    p.status,
    p.amount_satang,
    p.paid_at,
    p.failed_at,
    p.created_at,
    o.status AS order_status,
    o.buyer_id,
    o.seller_id
  FROM shared.payments p
  JOIN shared.hire_orders o ON o.id = p.hire_order_id
  WHERE (_status IS NULL OR _status = '' OR p.status = _status)
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_payments(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_payments(text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_account_balances(_limit int DEFAULT 100)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  pending_satang bigint,
  available_satang bigint,
  payout_reserved_satang bigint,
  paid_out_satang bigint,
  disputed_satang bigint,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  RETURN QUERY
  SELECT
    b.user_id,
    COALESCE(pr.display_name, pr.username, b.user_id::text) AS user_name,
    b.pending_satang,
    b.available_satang,
    b.payout_reserved_satang,
    b.paid_out_satang,
    b.disputed_satang,
    b.updated_at
  FROM shared.account_balances b
  LEFT JOIN shared.profiles pr ON pr.user_id = b.user_id
  ORDER BY (b.pending_satang + b.available_satang) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_account_balances(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_account_balances(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_finance_ledger(
  _user_id uuid DEFAULT NULL,
  _hire_order_id uuid DEFAULT NULL,
  _limit int DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  hire_order_id uuid,
  payment_id uuid,
  payout_request_id uuid,
  entry_type text,
  amount_satang bigint,
  direction smallint,
  note text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.user_id,
    COALESCE(pr.display_name, pr.username, e.user_id::text) AS user_name,
    e.hire_order_id,
    e.payment_id,
    e.payout_request_id,
    e.entry_type,
    e.amount_satang,
    e.direction,
    e.note,
    e.created_at
  FROM shared.ledger_entries e
  LEFT JOIN shared.profiles pr ON pr.user_id = e.user_id
  WHERE (_user_id IS NULL OR e.user_id = _user_id)
    AND (_hire_order_id IS NULL OR e.hire_order_id = _hire_order_id)
  ORDER BY e.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 200), 1000));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_finance_ledger(uuid, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_finance_ledger(uuid, uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_payout_requests(
  _status text DEFAULT NULL,
  _limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  recipient_id uuid,
  status text,
  kind text,
  amount_satang bigint,
  fee_satang bigint,
  transfer_satang bigint,
  provider_transfer_id text,
  failure_reason text,
  created_at timestamptz,
  completed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    COALESCE(pr.display_name, pr.username, r.user_id::text) AS user_name,
    r.recipient_id,
    r.status,
    r.kind,
    r.amount_satang,
    r.fee_satang,
    r.transfer_satang,
    r.provider_transfer_id,
    r.failure_reason,
    r.created_at,
    r.completed_at
  FROM shared.payout_requests r
  LEFT JOIN shared.profiles pr ON pr.user_id = r.user_id
  WHERE (_status IS NULL OR _status = '' OR r.status = _status)
  ORDER BY r.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_payout_requests(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_payout_requests(text, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_recipients(
  _verified boolean DEFAULT NULL,
  _limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_name text,
  provider text,
  provider_recipient_id text,
  bank_code text,
  account_name text,
  account_last4 text,
  verified boolean,
  verified_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    COALESCE(pr.display_name, pr.username, r.user_id::text) AS user_name,
    r.provider,
    r.provider_recipient_id,
    r.bank_code,
    r.account_name,
    r.account_last4,
    r.verified,
    r.verified_at,
    r.created_at
  FROM shared.payment_recipients r
  LEFT JOIN shared.profiles pr ON pr.user_id = r.user_id
  WHERE (_verified IS NULL OR r.verified = _verified)
  ORDER BY r.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_recipients(boolean, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_recipients(boolean, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_refunds(_limit int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  hire_order_id uuid,
  payment_id uuid,
  cancel_request_id uuid,
  amount_satang bigint,
  status text,
  provider_refund_id text,
  money_terms text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  RETURN QUERY
  SELECT
    r.id, r.hire_order_id, r.payment_id, r.cancel_request_id,
    r.amount_satang, r.status, r.provider_refund_id, r.money_terms, r.created_at
  FROM shared.refunds r
  ORDER BY r.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_refunds(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_refunds(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_disputes(_limit int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  hire_order_id uuid,
  status text,
  reason text,
  resolution text,
  created_at timestamptz,
  resolved_at timestamptz,
  order_status text,
  seller_id uuid,
  buyer_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  RETURN QUERY
  SELECT
    d.id, d.hire_order_id, d.status, d.reason, d.resolution,
    d.created_at, d.resolved_at,
    o.status AS order_status, o.seller_id, o.buyer_id
  FROM shared.payment_disputes d
  JOIN shared.hire_orders o ON o.id = d.hire_order_id
  ORDER BY d.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_disputes(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_disputes(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_provider_events(
  _unprocessed_only boolean DEFAULT false,
  _limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  provider text,
  provider_event_id text,
  event_type text,
  processed_at timestamptz,
  process_error text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  RETURN QUERY
  SELECT
    e.id, e.provider, e.provider_event_id, e.event_type,
    e.processed_at, e.process_error, e.created_at
  FROM shared.provider_events e
  WHERE (
    NOT COALESCE(_unprocessed_only, false)
    OR e.processed_at IS NULL
    OR e.process_error IS NOT NULL
  )
  ORDER BY e.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 100), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_provider_events(boolean, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_provider_events(boolean, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_payment_config()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  flags shared.aplus1_payment_flags%ROWTYPE;
  fee shared.aplus1_fee_configs%ROWTYPE;
  fx_rate numeric;
  fx_as_of timestamptz;
  fx_source text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  SELECT * INTO flags FROM shared.aplus1_payment_flags WHERE id = 1;
  SELECT * INTO fee FROM shared.aplus1_fee_configs
  WHERE effective_to IS NULL
  ORDER BY effective_from DESC
  LIMIT 1;

  SELECT r.rate, r.as_of, r.source INTO fx_rate, fx_as_of, fx_source
  FROM shared.fx_rates r
  WHERE r.quote_currency = 'USD'
  ORDER BY r.as_of DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'flags', to_jsonb(flags),
    'fee', CASE WHEN fee.id IS NULL THEN NULL ELSE to_jsonb(fee) END,
    'fx_usd', jsonb_build_object(
      'rate', fx_rate,
      'as_of', fx_as_of,
      'source', fx_source
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_payment_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_payment_config() TO authenticated;

-- ---------------------------------------------------------------------------
-- Mutations
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_update_fee_config(
  _platform_fee_percent numeric,
  _card_surcharge_percent numeric DEFAULT 0,
  _card_fee_passed_to_buyer boolean DEFAULT true,
  _version text DEFAULT NULL
)
RETURNS shared.aplus1_fee_configs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  ver text;
  row shared.aplus1_fee_configs;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;
  IF _platform_fee_percent < 0 OR _platform_fee_percent > 50 THEN
    RAISE EXCEPTION 'platform fee ต้องอยู่ระหว่าง 0–50';
  END IF;

  -- close previous effective rows
  UPDATE shared.aplus1_fee_configs
  SET effective_to = now()
  WHERE effective_to IS NULL;

  ver := COALESCE(NULLIF(trim(_version), ''), 'aplus1-' || to_char(now(), 'YYYYMMDDHH24MISS'));

  INSERT INTO shared.aplus1_fee_configs (
    version, platform_fee_percent, card_fee_passed_to_buyer, card_surcharge_percent, effective_from
  ) VALUES (
    ver, _platform_fee_percent, _card_fee_passed_to_buyer, COALESCE(_card_surcharge_percent, 0), now()
  )
  RETURNING * INTO row;

  PERFORM public._finance_audit('fee_config.update', 'fee_config', row.id, to_jsonb(row));
  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_fee_config(numeric, numeric, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_fee_config(numeric, numeric, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_upsert_fx_rate(
  _quote_currency text,
  _rate numeric,
  _source text DEFAULT 'admin'
)
RETURNS shared.fx_rates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  row shared.fx_rates;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;
  IF _rate IS NULL OR _rate <= 0 THEN
    RAISE EXCEPTION 'เรทต้องมากกว่า 0';
  END IF;

  INSERT INTO shared.fx_rates (quote_currency, rate, source, as_of, created_by)
  VALUES (upper(_quote_currency), _rate, COALESCE(NULLIF(_source, ''), 'admin'), now(), auth.uid())
  RETURNING * INTO row;

  INSERT INTO shared.fx_rate_snapshots (quote_currency, rate, source, as_of)
  VALUES (row.quote_currency, row.rate, row.source, row.as_of);

  PERFORM public._finance_audit('fx_rate.upsert', 'fx_rate', row.id, to_jsonb(row));
  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_fx_rate(text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_fx_rate(text, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_payment_flags(_patch jsonb)
RETURNS shared.aplus1_payment_flags
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  row shared.aplus1_payment_flags;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  UPDATE shared.aplus1_payment_flags SET
    omise_payments_enabled = COALESCE((_patch->>'omise_payments_enabled')::boolean, omise_payments_enabled),
    omise_promptpay_enabled = COALESCE((_patch->>'omise_promptpay_enabled')::boolean, omise_promptpay_enabled),
    omise_card_enabled = COALESCE((_patch->>'omise_card_enabled')::boolean, omise_card_enabled),
    bank_transfer_enabled = COALESCE((_patch->>'bank_transfer_enabled')::boolean, bank_transfer_enabled),
    manual_payout_enabled = COALESCE((_patch->>'manual_payout_enabled')::boolean, manual_payout_enabled),
    auto_payout_enabled = COALESCE((_patch->>'auto_payout_enabled')::boolean, auto_payout_enabled),
    end_of_month_sweep_enabled = COALESCE((_patch->>'end_of_month_sweep_enabled')::boolean, end_of_month_sweep_enabled),
    live_marketplace_payments_enabled = COALESCE((_patch->>'live_marketplace_payments_enabled')::boolean, live_marketplace_payments_enabled),
    card_fee_passed_to_buyer = COALESCE((_patch->>'card_fee_passed_to_buyer')::boolean, card_fee_passed_to_buyer),
    display_currency_enabled = COALESCE((_patch->>'display_currency_enabled')::boolean, display_currency_enabled),
    updated_at = now()
  WHERE id = 1
  RETURNING * INTO row;

  PERFORM public._finance_audit('payment_flags.update', 'payment_flags', NULL, to_jsonb(row));
  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_payment_flags(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_payment_flags(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_verify_recipient(_id uuid)
RETURNS shared.payment_recipients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  row shared.payment_recipients;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  UPDATE shared.payment_recipients
  SET verified = true, verified_at = now(), updated_at = now()
  WHERE id = _id
  RETURNING * INTO row;

  IF row.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบผู้รับเงิน';
  END IF;

  PERFORM public._finance_audit('recipient.verify', 'recipient', row.id, jsonb_build_object('user_id', row.user_id));
  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_verify_recipient(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_verify_recipient(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_recipient(_id uuid, _note text DEFAULT '')
RETURNS shared.payment_recipients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  row shared.payment_recipients;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  UPDATE shared.payment_recipients
  SET verified = false, verified_at = NULL, updated_at = now()
  WHERE id = _id
  RETURNING * INTO row;

  IF row.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบผู้รับเงิน';
  END IF;

  PERFORM public._finance_audit(
    'recipient.reject',
    'recipient',
    row.id,
    jsonb_build_object('user_id', row.user_id, 'note', COALESCE(_note, ''))
  );
  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_recipient(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_recipient(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  _id uuid,
  _resolution text,
  _release_to_available boolean DEFAULT false
)
RETURNS shared.payment_disputes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  d shared.payment_disputes;
  o shared.hire_orders;
  bal shared.account_balances;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  SELECT * INTO d FROM shared.payment_disputes WHERE id = _id FOR UPDATE;
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบข้อพิพาท';
  END IF;

  SELECT * INTO o FROM shared.hire_orders WHERE id = d.hire_order_id;

  UPDATE shared.payment_disputes
  SET status = 'resolved',
      resolution = COALESCE(_resolution, ''),
      resolved_at = now()
  WHERE id = _id
  RETURNING * INTO d;

  IF _release_to_available AND o.seller_id IS NOT NULL THEN
    INSERT INTO shared.ledger_entries (
      user_id, hire_order_id, entry_type, amount_satang, direction, note
    ) VALUES (
      o.seller_id, o.id, 'dispute_release', o.seller_net_satang, 1, 'admin resolve dispute'
    );

    INSERT INTO shared.account_balances (user_id, available_satang, disputed_satang, updated_at)
    VALUES (o.seller_id, o.seller_net_satang, 0, now())
    ON CONFLICT (user_id) DO UPDATE SET
      available_satang = shared.account_balances.available_satang + EXCLUDED.available_satang,
      disputed_satang = GREATEST(0, shared.account_balances.disputed_satang - o.seller_net_satang),
      updated_at = now();

    UPDATE shared.hire_orders
    SET status = 'available', available_at = now(), updated_at = now()
    WHERE id = o.id;
  END IF;

  PERFORM public._finance_audit(
    'dispute.resolve',
    'dispute',
    d.id,
    jsonb_build_object(
      'resolution', _resolution,
      'release_to_available', _release_to_available,
      'hire_order_id', o.id
    )
  );
  RETURN d;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_dispute(uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(uuid, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_manual_ledger_adjustment(
  _user_id uuid,
  _amount_satang bigint,
  _direction smallint,
  _bucket text,
  _note text DEFAULT ''
)
RETURNS shared.ledger_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  entry shared.ledger_entries;
  amt bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;
  IF _amount_satang IS NULL OR _amount_satang <= 0 THEN
    RAISE EXCEPTION 'จำนวนต้องมากกว่า 0';
  END IF;
  IF _direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'direction ต้องเป็น 1 หรือ -1';
  END IF;
  IF _bucket NOT IN ('pending', 'available', 'disputed') THEN
    RAISE EXCEPTION 'bucket ไม่ถูกต้อง';
  END IF;

  amt := _amount_satang * _direction;

  INSERT INTO shared.ledger_entries (
    user_id, entry_type, amount_satang, direction, note
  ) VALUES (
    _user_id, 'manual_adjustment', _amount_satang, _direction,
    COALESCE(NULLIF(trim(_note), ''), 'admin manual adjustment')
  )
  RETURNING * INTO entry;

  INSERT INTO shared.account_balances (user_id, updated_at)
  VALUES (_user_id, now())
  ON CONFLICT (user_id) DO NOTHING;

  IF _bucket = 'pending' THEN
    UPDATE shared.account_balances
    SET pending_satang = GREATEST(0, pending_satang + amt), updated_at = now()
    WHERE user_id = _user_id;
  ELSIF _bucket = 'available' THEN
    UPDATE shared.account_balances
    SET available_satang = GREATEST(0, available_satang + amt), updated_at = now()
    WHERE user_id = _user_id;
  ELSE
    UPDATE shared.account_balances
    SET disputed_satang = GREATEST(0, disputed_satang + amt), updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  PERFORM public._finance_audit(
    'ledger.manual_adjustment',
    'ledger_entry',
    entry.id,
    jsonb_build_object(
      'user_id', _user_id,
      'amount_satang', _amount_satang,
      'direction', _direction,
      'bucket', _bucket,
      'note', _note
    )
  );
  RETURN entry;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_manual_ledger_adjustment(uuid, bigint, smallint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_manual_ledger_adjustment(uuid, bigint, smallint, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_provider_event_reprocess(_id uuid)
RETURNS shared.provider_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  row shared.provider_events;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  UPDATE shared.provider_events
  SET processed_at = NULL, process_error = NULL
  WHERE id = _id
  RETURNING * INTO row;

  IF row.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบ provider event';
  END IF;

  PERFORM public._finance_audit('provider_event.reprocess', 'provider_event', row.id, jsonb_build_object(
    'provider_event_id', row.provider_event_id,
    'event_type', row.event_type
  ));
  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_mark_provider_event_reprocess(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_mark_provider_event_reprocess(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_retry_failed_payout(_id uuid)
RETURNS shared.payout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  old shared.payout_requests;
  neu shared.payout_requests;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  SELECT * INTO old FROM shared.payout_requests WHERE id = _id;
  IF old.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบคำขอถอน';
  END IF;
  IF old.status <> 'failed' THEN
    RAISE EXCEPTION 'รีทรายได้เฉพาะสถานะ failed';
  END IF;

  INSERT INTO shared.payout_requests (
    user_id, recipient_id, status, kind, amount_satang, fee_satang, transfer_satang, idempotency_key
  ) VALUES (
    old.user_id,
    old.recipient_id,
    'queued',
    old.kind,
    old.amount_satang,
    old.fee_satang,
    old.transfer_satang,
    'retry:' || old.id::text || ':' || extract(epoch from now())::bigint::text
  )
  RETURNING * INTO neu;

  INSERT INTO shared.payout_items (payout_request_id, hire_order_id, amount_satang)
  SELECT neu.id, pi.hire_order_id, pi.amount_satang
  FROM shared.payout_items pi
  WHERE pi.payout_request_id = old.id;

  PERFORM public._finance_audit(
    'payout.retry',
    'payout_request',
    neu.id,
    jsonb_build_object('from_id', old.id)
  );
  RETURN neu;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_retry_failed_payout(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_retry_failed_payout(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_finance_overview IS 'Aplus1 Omise/ledger admin KPIs';
