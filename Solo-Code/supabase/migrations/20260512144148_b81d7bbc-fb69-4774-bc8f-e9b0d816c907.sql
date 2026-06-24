-- Status history table for client invoices
CREATE TABLE public.finance_invoice_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.finance_clients_invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_status_history_invoice ON public.finance_invoice_status_history(invoice_id, changed_at DESC);
CREATE INDEX idx_invoice_status_history_user ON public.finance_invoice_status_history(user_id);

ALTER TABLE public.finance_invoice_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners select own status history"
  ON public.finance_invoice_status_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Owners insert own status history"
  ON public.finance_invoice_status_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners delete own status history"
  ON public.finance_invoice_status_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Trigger: log status changes
CREATE OR REPLACE FUNCTION public.log_invoice_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _note TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _note := NULLIF(NEW.meta->>'status_change_note', '');
    INSERT INTO public.finance_invoice_status_history (invoice_id, user_id, from_status, to_status, note)
    VALUES (NEW.id, NEW.user_id, OLD.status, NEW.status, _note);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_invoice_status_change
AFTER UPDATE OF status ON public.finance_clients_invoices
FOR EACH ROW EXECUTE FUNCTION public.log_invoice_status_change();

-- Trigger: notify on late
CREATE OR REPLACE FUNCTION public.notify_on_invoice_late()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('late7', 'late30') THEN
    INSERT INTO public.notifications (user_id, type, message, url)
    VALUES (
      NEW.user_id,
      'invoice_late',
      'ใบแจ้งหนี้ "' || COALESCE(NEW.name, '') || '" ' ||
      CASE NEW.status WHEN 'late7' THEN 'เลยกำหนดมา 7 วัน' ELSE 'เลยกำหนดมา 30 วัน' END,
      '/dashboard?tab=clients'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_invoice_late
AFTER UPDATE OF status ON public.finance_clients_invoices
FOR EACH ROW EXECUTE FUNCTION public.notify_on_invoice_late();

-- Auto-update late statuses based on due_date (caller-scoped via RLS)
CREATE OR REPLACE FUNCTION public.auto_update_invoice_statuses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER := 0;
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN 0; END IF;

  WITH upd AS (
    UPDATE public.finance_clients_invoices
       SET status = 'late30'
     WHERE user_id = _uid
       AND status IN ('ontime', 'late7')
       AND due_date IS NOT NULL
       AND (CURRENT_DATE - due_date) > 30
    RETURNING 1
  )
  SELECT affected + COUNT(*) INTO affected FROM upd;

  WITH upd2 AS (
    UPDATE public.finance_clients_invoices
       SET status = 'late7'
     WHERE user_id = _uid
       AND status = 'ontime'
       AND due_date IS NOT NULL
       AND (CURRENT_DATE - due_date) > 7
       AND (CURRENT_DATE - due_date) <= 30
    RETURNING 1
  )
  SELECT affected + COUNT(*) INTO affected FROM upd2;

  RETURN affected;
END;
$$;