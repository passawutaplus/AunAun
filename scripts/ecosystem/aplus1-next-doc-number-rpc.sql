-- Sequential hire document / order numbers (QT / INV / RCP / FEE / WHT / ORD)
-- Apply after aplus1-hire-flow-docs.sql
-- App calls shared.next_doc_number via sharedDb.rpc at persist time.

ALTER TABLE shared.doc_number_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE shared.doc_number_counters FROM PUBLIC, anon, authenticated;

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
  IF auth.role() IS DISTINCT FROM 'service_role' AND auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_kind IS NULL OR length(trim(p_kind)) = 0 OR length(p_kind) > 40 THEN
    RAISE EXCEPTION 'invalid document kind';
  END IF;

  prefix := CASE p_kind
    WHEN 'quotation' THEN 'QT'
    WHEN 'invoice' THEN 'INV'
    WHEN 'receipt' THEN 'RCP'
    WHEN 'platform_fee_receipt' THEN 'FEE'
    WHEN 'wht_cert' THEN 'WHT'
    WHEN 'hire_order' THEN 'ORD'
    ELSE NULL
  END;

  IF prefix IS NULL THEN
    RAISE EXCEPTION 'unsupported document kind';
  END IF;

  INSERT INTO shared.doc_number_counters (kind, year, last_n)
  VALUES (p_kind, y, 1)
  ON CONFLICT (kind, year) DO UPDATE
    SET last_n = shared.doc_number_counters.last_n + 1
  RETURNING last_n INTO n;

  RETURN prefix || '-' || y::text || '-' || lpad(n::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION shared.next_doc_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION shared.next_doc_number(text) TO authenticated, service_role;
