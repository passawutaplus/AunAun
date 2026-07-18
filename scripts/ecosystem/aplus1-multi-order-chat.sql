-- Multi-order in same hire chat: allow buyer/seller to create hire_orders,
-- scope cancel requests to a specific order when provided.
-- Apply after aplus1-hire-flow-docs.sql + hire-cancel-request-flow.sql

CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS anthem;

-- ---------------------------------------------------------------------------
-- hire_orders RLS — participants can read/insert/update their orders
-- ---------------------------------------------------------------------------

ALTER TABLE shared.hire_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hire_orders_select ON shared.hire_orders;
CREATE POLICY hire_orders_select ON shared.hire_orders
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS hire_orders_insert ON shared.hire_orders;
CREATE POLICY hire_orders_insert ON shared.hire_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
    OR seller_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS hire_orders_update ON shared.hire_orders;
CREATE POLICY hire_orders_update ON shared.hire_orders
  FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- Cancel requests: optional hire_order_id for multi-order chats
-- ---------------------------------------------------------------------------

ALTER TABLE anthem.hire_cancel_requests
  ADD COLUMN IF NOT EXISTS hire_order_id uuid;

COMMENT ON COLUMN anthem.hire_cancel_requests.hire_order_id IS
  'When set, cancel applies to this hire_orders row (multi-order chat). Null = request-level (legacy).';

CREATE INDEX IF NOT EXISTS hire_cancel_requests_order_idx
  ON anthem.hire_cancel_requests (hire_order_id)
  WHERE hire_order_id IS NOT NULL;

-- Allow one pending cancel per order (in addition to per-request legacy unique)
DROP INDEX IF EXISTS hire_cancel_requests_one_pending_per_order_idx;
CREATE UNIQUE INDEX hire_cancel_requests_one_pending_per_order_idx
  ON anthem.hire_cancel_requests (hire_order_id)
  WHERE hire_order_id IS NOT NULL
    AND status IN ('pending', 'countered');
