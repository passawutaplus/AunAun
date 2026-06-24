-- Support Tickets (Issue Tracking MVP)

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION public.format_ticket_number(n bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'TKT-' || lpad(n::text, 4, '0');
$$;

CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  category TEXT NOT NULL DEFAULT 'bug'
    CHECK (category IN ('bug', 'improvement', 'question', 'other')),
  source TEXT NOT NULL DEFAULT 'support_hub'
    CHECK (source IN ('feedback_button', 'support_hub', 'admin_manual')),
  source_feature TEXT,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_progress', 'qa', 'resolved', 'closed', 'wont_fix')),
  admin_note TEXT,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status, priority, created_at DESC);
CREATE INDEX idx_support_tickets_number ON public.support_tickets(ticket_number);

CREATE TABLE public.ticket_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_attachments_ticket ON public.ticket_attachments(ticket_id);

CREATE TABLE public.ticket_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  actor_id UUID,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created', 'status_change', 'priority_change', 'comment', 'note')),
  old_value TEXT,
  new_value TEXT,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_events_ticket ON public.ticket_events(ticket_id, created_at ASC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.ticket_attachments TO authenticated;
GRANT SELECT, INSERT ON public.ticket_events TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT ALL ON public.ticket_attachments TO service_role;
GRANT ALL ON public.ticket_events TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;

-- Assign ticket number on insert
CREATE OR REPLACE FUNCTION public.assign_support_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR btrim(NEW.ticket_number) = '' THEN
    NEW.ticket_number := public.format_ticket_number(nextval('public.support_ticket_number_seq'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_support_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.assign_support_ticket_number();

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Log ticket lifecycle events
CREATE OR REPLACE FUNCTION public.log_support_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, new_value, body)
    VALUES (NEW.id, NEW.user_id, 'created', NEW.status, NEW.title);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status_change', OLD.status, NEW.status);
    END IF;

    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      INSERT INTO public.ticket_events (ticket_id, actor_id, event_type, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'priority_change', OLD.priority, NEW.priority);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_log_support_ticket_changes
  AFTER INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.log_support_ticket_changes();

CREATE OR REPLACE FUNCTION public.set_support_ticket_closed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('closed', 'wont_fix') AND NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    ELSIF NEW.status NOT IN ('closed', 'wont_fix') THEN
      NEW.closed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_support_ticket_closed_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_support_ticket_closed_at();

-- Notify ticket owner on status changes
CREATE OR REPLACE FUNCTION public.notify_on_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _msg TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'in_progress' THEN
    _msg := 'ตั๋ว ' || NEW.ticket_number || ' กำลังได้รับการแก้ไข';
  ELSIF NEW.status = 'resolved' THEN
    _msg := 'ตั๋ว ' || NEW.ticket_number || ' แก้ไขแล้ว — กำลังปล่อยอัปเดต';
  ELSIF NEW.status = 'closed' THEN
    _msg := 'ตั๋ว ' || NEW.ticket_number || ' ปิดงานเรียบร้อยแล้ว';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, message, url)
  VALUES (NEW.user_id, 'ticket', _msg, '/dashboard');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_ticket_status_change
  AFTER UPDATE OF status ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_ticket_status_change();

-- RLS: support_tickets
CREATE POLICY "Users view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own new tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'new')
  WITH CHECK (auth.uid() = user_id AND status = 'new');

CREATE POLICY "Admins manage all tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete tickets"
  ON public.support_tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: ticket_attachments
CREATE POLICY "Users view own ticket attachments"
  ON public.ticket_attachments FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert own ticket attachments"
  ON public.ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins delete ticket attachments"
  ON public.ticket_attachments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS: ticket_events
CREATE POLICY "Users view events on own tickets"
  ON public.ticket_events FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users comment on own open tickets"
  ON public.ticket_events FOR INSERT TO authenticated
  WITH CHECK (
    event_type = 'comment'
    AND actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND t.user_id = auth.uid()
        AND t.status NOT IN ('closed', 'wont_fix')
    )
  );

CREATE POLICY "Admins insert ticket events"
  ON public.ticket_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for ticket screenshots (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "ticket-attachments owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "ticket-attachments owner or admin select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "ticket-attachments owner or admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );
