-- ⚠️  อย่ารันไฟล์นี้ถ้ายังไม่มีตาราง quotations / job_trackers ฯลฯ
-- ถ้า error "relation public.quotations does not exist" → ใช้ CLI push ทั้งหมดแทน:
--   export SUPABASE_ACCESS_TOKEN=...
--   ./scripts/supabase-push-pipeline.sh
--
-- So1o: รวม migrations ที่ยังไม่ได้ push (2026-06) เท่านั้น
-- Project: rvnzjiskqliexysicfmh
-- ลำดับ: contract → support_tickets → shared_projects → organization


-- ========== 20260605100000_quotations_contract.sql ==========
-- Contract fields on quotations (Phase 1.5)
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_accepted boolean NOT NULL DEFAULT false;

-- ========== 20260604150000_support_tickets.sql ==========
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

-- ========== 20260605110000_shared_projects_phase2.sql ==========
-- Phase 2: Shared Squad schema (feature-gated in app until enabled)
CREATE TABLE IF NOT EXISTS public.shared_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  pricing_model text NOT NULL DEFAULT 'pay_per_project'
    CHECK (pricing_model IN ('pay_per_project', 'monthly_squad')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'closed')),
  tax_split_config jsonb NOT NULL DEFAULT '[]'::jsonb,
  guest_token text UNIQUE,
  guest_visible_columns text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.shared_projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  role text NOT NULL DEFAULT 'collaborator'
    CHECK (role IN ('host', 'collaborator', 'guest')),
  revenue_percent numeric(5,2) NOT NULL DEFAULT 0,
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  UNIQUE (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.shared_projects(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES public.project_members(id) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'doing', 'review', 'done')),
  sort_order int NOT NULL DEFAULT 0,
  handover_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_projects_host ON public.shared_projects(host_user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id);

ALTER TABLE public.shared_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_projects_host_select" ON public.shared_projects
  FOR SELECT USING (auth.uid() = host_user_id);

CREATE POLICY "shared_projects_host_insert" ON public.shared_projects
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "shared_projects_host_update" ON public.shared_projects
  FOR UPDATE USING (auth.uid() = host_user_id) WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "shared_projects_host_delete" ON public.shared_projects
  FOR DELETE USING (auth.uid() = host_user_id);

CREATE POLICY "project_members_host_all" ON public.project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
  );

CREATE POLICY "project_members_self_select" ON public.project_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "project_tasks_member_access" ON public.project_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_tasks.project_id AND pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_projects sp
      WHERE sp.id = project_id AND sp.host_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_tasks.project_id AND pm.user_id = auth.uid()
    )
  );

-- ========== 20260605120000_pipeline_supabase_organization.sql ==========
-- Pipeline / Contract / Shared Squad — schema organization (idempotent)
-- Domain: Business Pipeline (quotations ↔ job_trackers ↔ finance_incomes)

-- ── Quotations: contract e-sign metadata ─────────────────────────────────────
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_signer_ip text;

COMMENT ON COLUMN public.quotations.contract_signed_at IS 'Timestamp when contract was accepted (Phase 1.5)';
COMMENT ON COLUMN public.quotations.contract_accepted IS 'Freelancer confirmed client agreement on contract template';
COMMENT ON COLUMN public.quotations.contract_signer_ip IS 'Best-effort client IP at sign time (optional)';

CREATE INDEX IF NOT EXISTS idx_quotations_contract_accepted
  ON public.quotations (user_id, contract_accepted)
  WHERE contract_accepted = true;

CREATE INDEX IF NOT EXISTS idx_quotations_pipeline_status
  ON public.quotations (user_id, status, updated_at DESC)
  WHERE status NOT IN ('rejected', 'expired');

-- ── Job trackers: pipeline link index ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_trackers_quotation_id
  ON public.job_trackers (quotation_id)
  WHERE quotation_id IS NOT NULL;

COMMENT ON COLUMN public.job_trackers.quotation_id IS 'Links to quotations.id — Pipeline deal card';

-- ── Finance incomes: pipeline link index ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_finance_incomes_source_quotation
  ON public.finance_incomes (source_quotation_id)
  WHERE source_quotation_id IS NOT NULL;

-- ── Shared Squad (Phase 2) — grants + updated_at triggers ────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'shared_projects') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_projects TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
    GRANT ALL ON public.shared_projects TO service_role;
    GRANT ALL ON public.project_members TO service_role;
    GRANT ALL ON public.project_tasks TO service_role;

    DROP TRIGGER IF EXISTS trg_shared_projects_updated_at ON public.shared_projects;
    CREATE TRIGGER trg_shared_projects_updated_at
      BEFORE UPDATE ON public.shared_projects
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS trg_project_tasks_updated_at ON public.project_tasks;
    CREATE TRIGGER trg_project_tasks_updated_at
      BEFORE UPDATE ON public.project_tasks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    COMMENT ON TABLE public.shared_projects IS 'Phase 2: Ad-hoc freelance squad projects (feature-gated)';
    COMMENT ON TABLE public.project_members IS 'Collaborators + revenue split % for shared_projects';
    COMMENT ON TABLE public.project_tasks IS 'Team kanban tasks within shared_projects';
  END IF;
END $$;
