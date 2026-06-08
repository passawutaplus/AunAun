-- Ops Hub: missing schema pieces on rvnzjiskqliexysicfmh
-- Apply via Supabase SQL editor or: cd Solo-Code && npx supabase db push

-- 1) app_feedback admin workflow columns (anthem schema)
ALTER TABLE anthem.app_feedback
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS admin_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_app_feedback_status ON anthem.app_feedback(status);

DROP POLICY IF EXISTS "Admins update feedback" ON anthem.app_feedback;
CREATE POLICY "Admins update feedback" ON anthem.app_feedback
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) platform_events activity feed (public schema)
CREATE TABLE IF NOT EXISTS public.platform_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,
  actor_id    uuid,
  target_type text,
  target_id   uuid,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_events_created_at_idx ON public.platform_events (created_at DESC);

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin reads platform_events" ON public.platform_events;
CREATE POLICY "admin reads platform_events"
  ON public.platform_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.platform_events TO authenticated;
GRANT ALL ON public.platform_events TO service_role;

-- 3) ops PM schema: run Solo-Code/supabase/migrations/20260610120000_ops_hub_pm_schema.sql
-- 4) Supabase Dashboard → Settings → API → Exposed schemas: add "ops"
