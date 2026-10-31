-- Studio documents: quotations, invoices (per installment) and receipts issued by a freelancer.
-- Free launch: parties pay each other directly — SAMECOR only records documents and statuses.
-- Chat messages carry a pointer card; this table is the source of truth for status + My Studio.

CREATE TABLE IF NOT EXISTS shared.studio_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES shared.conversations (id) ON DELETE SET NULL,
  client_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('quotation', 'invoice', 'receipt')),
  doc_number text NOT NULL,
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'paid', 'void')),
  quote_id uuid REFERENCES shared.studio_documents (id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES shared.studio_documents (id) ON DELETE SET NULL,
  installment_no int CHECK (installment_no IS NULL OR installment_no BETWEEN 1 AND 12),
  installment_total int CHECK (installment_total IS NULL OR installment_total BETWEEN 1 AND 12),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  client_name text CHECK (client_name IS NULL OR length(client_name) <= 200),
  amount_satang bigint NOT NULL DEFAULT 0 CHECK (amount_satang >= 0),
  wht_satang bigint NOT NULL DEFAULT 0 CHECK (wht_satang >= 0),
  net_satang bigint NOT NULL DEFAULT 0 CHECK (net_satang >= 0),
  issue_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Bangkok')::date),
  due_date date,
  paid_at timestamptz,
  payment_method text CHECK (payment_method IS NULL OR length(payment_method) <= 80),
  client_marked_paid_at timestamptz,
  client_payment_note text CHECK (client_payment_note IS NULL OR length(client_payment_note) <= 500),
  responded_at timestamptz,
  offer jsonb,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS studio_documents_owner_created_idx
  ON shared.studio_documents (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS studio_documents_conversation_idx
  ON shared.studio_documents (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS studio_documents_quote_idx
  ON shared.studio_documents (quote_id);
CREATE INDEX IF NOT EXISTS studio_documents_client_idx
  ON shared.studio_documents (client_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS studio_documents_doc_number_uidx
  ON shared.studio_documents (doc_number);

CREATE OR REPLACE FUNCTION shared.studio_documents_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = shared, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS studio_documents_touch ON shared.studio_documents;
CREATE TRIGGER studio_documents_touch
  BEFORE UPDATE ON shared.studio_documents
  FOR EACH ROW EXECUTE FUNCTION shared.studio_documents_touch();

ALTER TABLE shared.studio_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS studio_documents_select ON shared.studio_documents;
CREATE POLICY studio_documents_select ON shared.studio_documents
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR client_user_id = auth.uid()
    OR (conversation_id IS NOT NULL AND shared.is_conversation_participant(conversation_id))
  );

DROP POLICY IF EXISTS studio_documents_insert ON shared.studio_documents;
CREATE POLICY studio_documents_insert ON shared.studio_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (conversation_id IS NULL OR shared.is_conversation_participant(conversation_id))
  );

DROP POLICY IF EXISTS studio_documents_update ON shared.studio_documents;
CREATE POLICY studio_documents_update ON shared.studio_documents
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

REVOKE ALL ON TABLE shared.studio_documents FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE shared.studio_documents TO authenticated;
GRANT ALL ON TABLE shared.studio_documents TO service_role;

-- Client side of a document (the other chat participant, never the owner):
--   accept / decline a quotation, or report "โอนแล้ว" on an invoice.
CREATE OR REPLACE FUNCTION shared.studio_doc_client_respond(
  p_doc_id uuid,
  p_action text,
  p_note text DEFAULT NULL
)
RETURNS shared.studio_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public, pg_temp
AS $$
DECLARE
  d shared.studio_documents;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO d FROM shared.studio_documents WHERE id = p_doc_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'document not found';
  END IF;
  IF d.owner_id = auth.uid() THEN
    RAISE EXCEPTION 'owner cannot respond to own document';
  END IF;
  IF NOT (
    d.client_user_id = auth.uid()
    OR (d.conversation_id IS NOT NULL AND shared.is_conversation_participant(d.conversation_id))
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF p_action IN ('accept', 'decline') THEN
    IF d.kind <> 'quotation' OR d.status <> 'sent' THEN
      RAISE EXCEPTION 'quotation is not awaiting a response';
    END IF;
    UPDATE shared.studio_documents
      SET status = CASE p_action WHEN 'accept' THEN 'accepted' ELSE 'declined' END,
          responded_at = now(),
          client_user_id = COALESCE(client_user_id, auth.uid()),
          client_payment_note = NULLIF(left(coalesce(p_note, ''), 500), '')
      WHERE id = d.id
      RETURNING * INTO d;
  ELSIF p_action = 'mark_paid' THEN
    IF d.kind <> 'invoice' OR d.status NOT IN ('sent') THEN
      RAISE EXCEPTION 'invoice is not awaiting payment';
    END IF;
    UPDATE shared.studio_documents
      SET client_marked_paid_at = now(),
          client_user_id = COALESCE(client_user_id, auth.uid()),
          client_payment_note = NULLIF(left(coalesce(p_note, ''), 500), '')
      WHERE id = d.id
      RETURNING * INTO d;
  ELSE
    RAISE EXCEPTION 'unsupported action';
  END IF;

  RETURN d;
END;
$$;

REVOKE ALL ON FUNCTION shared.studio_doc_client_respond(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shared.studio_doc_client_respond(uuid, text, text) TO authenticated;
