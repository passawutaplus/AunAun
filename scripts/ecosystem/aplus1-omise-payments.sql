-- Aplus1 Omise + internal THB ledger (satang integers)
-- Apply via ecosystem migration tooling after review.
-- Does NOT route money through Solo Stripe.

CREATE SCHEMA IF NOT EXISTS shared;

-- ---------------------------------------------------------------------------
-- Fee + FX config
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared.aplus1_fee_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 10,
  card_fee_passed_to_buyer boolean NOT NULL DEFAULT true,
  card_surcharge_percent numeric(5,2) NOT NULL DEFAULT 0,
  promptpay_buyer_pays_job_only boolean NOT NULL DEFAULT true,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO shared.aplus1_fee_configs (version, platform_fee_percent)
VALUES ('aplus1-v1', 10)
ON CONFLICT (version) DO NOTHING;

CREATE TABLE IF NOT EXISTS shared.fx_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'THB',
  quote_currency text NOT NULL,
  rate numeric(18,8) NOT NULL,
  source text NOT NULL DEFAULT 'admin',
  as_of timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_currency, as_of)
);

CREATE TABLE IF NOT EXISTS shared.fx_rate_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_currency text NOT NULL,
  rate numeric(18,8) NOT NULL,
  source text NOT NULL,
  as_of timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Hire orders + payments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared.hire_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_request_id uuid,
  conversation_id uuid,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  job_price_satang bigint NOT NULL CHECK (job_price_satang >= 0),
  buyer_pays_satang bigint NOT NULL CHECK (buyer_pays_satang >= 0),
  seller_net_satang bigint NOT NULL CHECK (seller_net_satang >= 0),
  platform_fee_percent numeric(5,2) NOT NULL,
  platform_fee_satang bigint NOT NULL,
  card_surcharge_satang bigint NOT NULL DEFAULT 0,
  fee_version text NOT NULL,
  payment_method text,
  display_currency text DEFAULT 'THB',
  fx_snapshot_id uuid REFERENCES shared.fx_rate_snapshots(id),
  currency text NOT NULL DEFAULT 'THB',
  paid_at timestamptz,
  approved_at timestamptz,
  available_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hire_orders_buyer_idx ON shared.hire_orders (buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hire_orders_seller_idx ON shared.hire_orders (seller_id, status);
CREATE INDEX IF NOT EXISTS hire_orders_hiring_idx ON shared.hire_orders (hiring_request_id);

CREATE TABLE IF NOT EXISTS shared.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hire_order_id uuid NOT NULL REFERENCES shared.hire_orders(id),
  provider text NOT NULL DEFAULT 'omise',
  provider_charge_id text,
  method text NOT NULL,
  status text NOT NULL DEFAULT 'created',
  amount_satang bigint NOT NULL,
  currency text NOT NULL DEFAULT 'THB',
  idempotency_key text NOT NULL UNIQUE,
  paid_at timestamptz,
  failed_at timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES shared.payments(id),
  attempt_no int NOT NULL DEFAULT 1,
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'omise',
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  process_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

-- ---------------------------------------------------------------------------
-- Ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hire_order_id uuid REFERENCES shared.hire_orders(id),
  payment_id uuid REFERENCES shared.payments(id),
  payout_request_id uuid,
  entry_type text NOT NULL,
  amount_satang bigint NOT NULL CHECK (amount_satang >= 0),
  direction smallint NOT NULL CHECK (direction IN (-1, 1)),
  currency text NOT NULL DEFAULT 'THB',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ledger_entries_user_idx ON shared.ledger_entries (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS shared.account_balances (
  user_id uuid PRIMARY KEY,
  pending_satang bigint NOT NULL DEFAULT 0,
  available_satang bigint NOT NULL DEFAULT 0,
  payout_reserved_satang bigint NOT NULL DEFAULT 0,
  paid_out_satang bigint NOT NULL DEFAULT 0,
  disputed_satang bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Recipients + payouts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared.payment_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'omise',
  provider_recipient_id text,
  bank_code text,
  account_name text,
  account_last4 text,
  account_encrypted text,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_recipients_user_active_idx
  ON shared.payment_recipients (user_id)
  WHERE verified = true;

CREATE TABLE IF NOT EXISTS shared.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_id uuid REFERENCES shared.payment_recipients(id),
  status text NOT NULL DEFAULT 'queued',
  kind text NOT NULL DEFAULT 'manual', -- manual | weekly | eom_sweep
  amount_satang bigint NOT NULL,
  fee_satang bigint NOT NULL DEFAULT 0,
  transfer_satang bigint NOT NULL,
  provider_transfer_id text,
  idempotency_key text NOT NULL UNIQUE,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS shared.payout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id uuid NOT NULL REFERENCES shared.payout_requests(id),
  hire_order_id uuid NOT NULL REFERENCES shared.hire_orders(id),
  amount_satang bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hire_order_id uuid NOT NULL REFERENCES shared.hire_orders(id),
  payment_id uuid REFERENCES shared.payments(id),
  cancel_request_id uuid,
  amount_satang bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider_refund_id text,
  money_terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.payment_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hire_order_id uuid NOT NULL REFERENCES shared.hire_orders(id),
  status text NOT NULL DEFAULT 'open',
  reason text,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS shared.payment_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.user_display_currency (
  user_id uuid PRIMARY KEY,
  display_currency text NOT NULL DEFAULT 'THB',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Feature flag row (ops)
CREATE TABLE IF NOT EXISTS shared.aplus1_payment_flags (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  omise_payments_enabled boolean NOT NULL DEFAULT false,
  omise_promptpay_enabled boolean NOT NULL DEFAULT true,
  omise_card_enabled boolean NOT NULL DEFAULT true,
  bank_transfer_enabled boolean NOT NULL DEFAULT false,
  manual_payout_enabled boolean NOT NULL DEFAULT true,
  auto_payout_enabled boolean NOT NULL DEFAULT false,
  end_of_month_sweep_enabled boolean NOT NULL DEFAULT false,
  live_marketplace_payments_enabled boolean NOT NULL DEFAULT false,
  card_fee_passed_to_buyer boolean NOT NULL DEFAULT true,
  display_currency_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO shared.aplus1_payment_flags (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE shared.hire_orders IS 'Aplus1 hire money orders settled in THB satang via Omise';
COMMENT ON TABLE shared.ledger_entries IS 'Append-only THB ledger; available only after approval';
