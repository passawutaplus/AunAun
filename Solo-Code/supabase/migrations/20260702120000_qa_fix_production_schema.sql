-- Production QA fix (2026-07-02): idempotent repair for schema cache / RPC / telemetry gaps.
-- Note: inhouse_org_members already exists via 20260612120000_inhouse_workspace on production.

CREATE TABLE IF NOT EXISTS public.saved_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('individual', 'company')),
  industry TEXT,
  phone TEXT,
  line_id TEXT,
  email TEXT,
  social TEXT,
  preferred_channel TEXT CHECK (preferred_channel IN ('line', 'phone', 'email', 'social')),
  address TEXT,
  tax_id TEXT,
  payment_terms TEXT,
  rate INTEGER,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_clients_user ON public.saved_clients(user_id);
ALTER TABLE public.saved_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners view own saved clients" ON public.saved_clients;
CREATE POLICY "Owners view own saved clients" ON public.saved_clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners insert own saved clients" ON public.saved_clients;
CREATE POLICY "Owners insert own saved clients" ON public.saved_clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners update own saved clients" ON public.saved_clients;
CREATE POLICY "Owners update own saved clients" ON public.saved_clients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners delete own saved clients" ON public.saved_clients;
CREATE POLICY "Owners delete own saved clients" ON public.saved_clients FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE SCHEMA IF NOT EXISTS so1o;

CREATE TABLE IF NOT EXISTS so1o.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  actor_user_id UUID,
  actor_name TEXT NOT NULL DEFAULT '',
  actor_avatar TEXT,
  type TEXT NOT NULL,
  project_id UUID,
  message TEXT NOT NULL DEFAULT '',
  url TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'notifications' AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.notifications SET SCHEMA so1o;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON so1o.notifications(user_id, created_at DESC);
ALTER TABLE so1o.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recipients view own notifications" ON so1o.notifications;
CREATE POLICY "Recipients view own notifications" ON so1o.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Recipients update own notifications" ON so1o.notifications;
CREATE POLICY "Recipients update own notifications" ON so1o.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Recipients delete own notifications" ON so1o.notifications;
CREATE POLICY "Recipients delete own notifications" ON so1o.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP VIEW IF EXISTS public.notifications;
CREATE VIEW public.notifications AS SELECT * FROM so1o.notifications;
GRANT SELECT, UPDATE, INSERT, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_active_at = now() WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.log_user_activity(_activity_type TEXT DEFAULT 'page_view')
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _exists BOOLEAN;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_activity_logs WHERE user_id = _uid AND activity_type = _activity_type AND created_at > now() - INTERVAL '1 hour') INTO _exists;
  IF _exists THEN RETURN false; END IF;
  INSERT INTO public.user_activity_logs (user_id, activity_type) VALUES (_uid, _activity_type);
  RETURN true;
END; $$;

GRANT EXECUTE ON FUNCTION public.touch_last_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_activity(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.user_device_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text,
  device_type text NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  os text,
  browser text,
  viewport_width integer,
  viewport_height integer,
  pixel_ratio numeric,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_device_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can log device event" ON public.user_device_events;
CREATE POLICY "Anyone can log device event" ON public.user_device_events FOR INSERT TO anon, authenticated WITH CHECK (true);
GRANT INSERT ON public.user_device_events TO anon, authenticated;
GRANT SELECT ON public.user_device_events TO authenticated;

NOTIFY pgrst, 'reload schema';
