-- Aplus1 hire flow: quotes, deliveries, documents, WHT, billing profile, linked work
-- Apply after aplus1-omise-payments.sql

CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS anthem;

-- ---------------------------------------------------------------------------
-- Extend hire_orders for deposit / WHT / dispute / quote link
-- ---------------------------------------------------------------------------

ALTER TABLE shared.hire_orders
  ADD COLUMN IF NOT EXISTS quote_id uuid,
  ADD COLUMN IF NOT EXISTS amount_paid_satang bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_satang bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wht_satang bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS auto_dispute_at timestamptz,
  ADD COLUMN IF NOT EXISTS work_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS wht_status text DEFAULT 'none';
  -- none | awaiting_cert | complete

COMMENT ON COLUMN shared.hire_orders.wht_status IS 'none | awaiting_cert | complete';

-- ---------------------------------------------------------------------------
-- Document numbering sequences (per calendar year via helper)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared.doc_number_counters (
  kind text NOT NULL,
  year int NOT NULL,
  last_n bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, year)
);

CREATE OR REPLACE FUNCTION shared.next_doc_number(p_kind text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, pg_temp
AS $$
DECLARE
  y int := EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Bangkok'))::int;
  n bigint;
  prefix text;
BEGIN
  prefix := CASE p_kind
    WHEN 'quotation' THEN 'QT'
    WHEN 'invoice' THEN 'INV'
    WHEN 'receipt' THEN 'RCP'
    WHEN 'platform_fee_receipt' THEN 'FEE'
    WHEN 'wht_cert' THEN 'WHT'
    ELSE upper(left(p_kind, 3))
  END;

  INSERT INTO shared.doc_number_counters (kind, year, last_n)
  VALUES (p_kind, y, 1)
  ON CONFLICT (kind, year) DO UPDATE
    SET last_n = shared.doc_number_counters.last_n + 1
  RETURNING last_n INTO n;

  RETURN prefix || '-' || y::text || '-' || lpad(n::text, 4, '0');
END;
$$;

-- ---------------------------------------------------------------------------
-- Hire quotes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared.hire_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_request_id uuid NOT NULL,
  conversation_id uuid,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'sent',
  -- sent | declined_by_client | expired | accepted | superseded
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  deposit_percent numeric(5,2) NOT NULL DEFAULT 100,
  wht_enabled boolean NOT NULL DEFAULT false,
  amount_satang bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'THB',
  doc_number text,
  expires_at timestamptz NOT NULL,
  decline_reason text,
  decline_note text,
  created_by uuid NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hire_quotes_request_idx
  ON shared.hire_quotes (hiring_request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS hire_quotes_status_expires_idx
  ON shared.hire_quotes (status, expires_at)
  WHERE status = 'sent';

ALTER TABLE shared.hire_orders
  DROP CONSTRAINT IF EXISTS hire_orders_quote_id_fkey;
ALTER TABLE shared.hire_orders
  ADD CONSTRAINT hire_orders_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES shared.hire_quotes(id);

CREATE TABLE IF NOT EXISTS shared.hire_quote_policy_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES shared.hire_quotes(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  terms_version text NOT NULL,
  payment_version text NOT NULL,
  hire_policy_version text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip text,
  user_agent text,
  UNIQUE (quote_id, buyer_id)
);

-- ---------------------------------------------------------------------------
-- Deliveries + documents + WHT
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared.hire_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hire_order_id uuid NOT NULL REFERENCES shared.hire_orders(id) ON DELETE CASCADE,
  links text[] NOT NULL DEFAULT '{}',
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text,
  revision int NOT NULL DEFAULT 1,
  submitted_by uuid NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hire_deliveries_order_idx
  ON shared.hire_deliveries (hire_order_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS shared.hire_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hire_order_id uuid REFERENCES shared.hire_orders(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES shared.hire_quotes(id) ON DELETE SET NULL,
  kind text NOT NULL,
  -- quotation | invoice | receipt | platform_fee_receipt | wht_cert
  doc_number text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_url text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS hire_documents_doc_number_uidx
  ON shared.hire_documents (doc_number);
CREATE INDEX IF NOT EXISTS hire_documents_order_idx
  ON shared.hire_documents (hire_order_id, kind);

CREATE TABLE IF NOT EXISTS shared.hire_wht_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hire_order_id uuid NOT NULL REFERENCES shared.hire_orders(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'upload',
  -- upload | post
  file_url text,
  uploaded_by uuid,
  received_confirmed_at timestamptz,
  received_confirmed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hire_wht_docs_order_idx
  ON shared.hire_wht_docs (hire_order_id);

-- ---------------------------------------------------------------------------
-- Profile billing fields (anthem.profiles if exists, else skip via DO)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE anthem.profiles
      ADD COLUMN IF NOT EXISTS billing_type text DEFAULT 'individual',
      ADD COLUMN IF NOT EXISTS legal_name text,
      ADD COLUMN IF NOT EXISTS company_name text,
      ADD COLUMN IF NOT EXISTS tax_id text,
      ADD COLUMN IF NOT EXISTS billing_address text,
      ADD COLUMN IF NOT EXISTS branch text,
      ADD COLUMN IF NOT EXISTS contact_person text,
      ADD COLUMN IF NOT EXISTS contact_role text,
      ADD COLUMN IF NOT EXISTS vat_registered boolean DEFAULT false;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- hiring_requests.linked_project_id
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'hiring_requests'
  ) THEN
    ALTER TABLE anthem.hiring_requests
      ADD COLUMN IF NOT EXISTS linked_project_id uuid;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'hiring_requests'
  ) THEN
    ALTER TABLE public.hiring_requests
      ADD COLUMN IF NOT EXISTS linked_project_id uuid;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RLS (participants via hire_orders buyer/seller)
-- ---------------------------------------------------------------------------

ALTER TABLE shared.hire_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.hire_quote_policy_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.hire_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.hire_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.hire_wht_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hire_quotes_select ON shared.hire_quotes;
CREATE POLICY hire_quotes_select ON shared.hire_quotes
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared.hire_orders o
      WHERE o.quote_id = hire_quotes.id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM anthem.hiring_requests hr
      WHERE hr.id = hire_quotes.hiring_request_id
        AND (hr.client_id = auth.uid() OR hr.freelancer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS hire_quotes_insert ON shared.hire_quotes;
CREATE POLICY hire_quotes_insert ON shared.hire_quotes
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS hire_quotes_update ON shared.hire_quotes;
CREATE POLICY hire_quotes_update ON shared.hire_quotes
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM anthem.hiring_requests hr
      WHERE hr.id = hire_quotes.hiring_request_id
        AND hr.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS hire_policy_acc_select ON shared.hire_quote_policy_acceptances;
CREATE POLICY hire_policy_acc_select ON shared.hire_quote_policy_acceptances
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM shared.hire_quotes q WHERE q.id = quote_id AND q.created_by = auth.uid()
  ));

DROP POLICY IF EXISTS hire_policy_acc_insert ON shared.hire_quote_policy_acceptances;
CREATE POLICY hire_policy_acc_insert ON shared.hire_quote_policy_acceptances
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS hire_deliveries_select ON shared.hire_deliveries;
CREATE POLICY hire_deliveries_select ON shared.hire_deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM shared.hire_orders o
    WHERE o.id = hire_order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
  ));

DROP POLICY IF EXISTS hire_deliveries_insert ON shared.hire_deliveries;
CREATE POLICY hire_deliveries_insert ON shared.hire_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM shared.hire_orders o
      WHERE o.id = hire_order_id AND o.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS hire_documents_select ON shared.hire_documents;
CREATE POLICY hire_documents_select ON shared.hire_documents
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM shared.hire_orders o
      WHERE o.id = hire_order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM shared.hire_quotes q
      WHERE q.id = quote_id AND q.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS hire_documents_insert ON shared.hire_documents;
CREATE POLICY hire_documents_insert ON shared.hire_documents
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

DROP POLICY IF EXISTS hire_wht_select ON shared.hire_wht_docs;
CREATE POLICY hire_wht_select ON shared.hire_wht_docs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM shared.hire_orders o
    WHERE o.id = hire_order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
  ));

DROP POLICY IF EXISTS hire_wht_insert ON shared.hire_wht_docs;
CREATE POLICY hire_wht_insert ON shared.hire_wht_docs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM shared.hire_orders o
    WHERE o.id = hire_order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
  ));

DROP POLICY IF EXISTS hire_wht_update ON shared.hire_wht_docs;
CREATE POLICY hire_wht_update ON shared.hire_wht_docs
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM shared.hire_orders o
    WHERE o.id = hire_order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
  ));

COMMENT ON TABLE shared.hire_quotes IS 'Aplus1 hire quotations with 48h expiry';
COMMENT ON TABLE shared.hire_documents IS 'Immutable document snapshots: QT/INV/RCP/FEE';
