-- Phase 3a: Shared notification center (used by both Anthem and So1o)

CREATE TABLE shared.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  app         text NOT NULL CHECK (app IN ('anthem','so1o','shared')),
  kind        text NOT NULL,          -- e.g. job_match, hire_request, quote_accepted, contract_signed
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  link        text NOT NULL DEFAULT '',  -- in-app route or absolute URL to the other app
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read     boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread_idx
  ON shared.notifications (user_id, is_read, created_at DESC)
  WHERE is_dismissed = false;

-- service_role already has full access via default privileges set when the
-- schema was created. Authenticated users go through the public view below.
GRANT SELECT, UPDATE ON shared.notifications TO authenticated;

ALTER TABLE shared.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner reads own notifications"
  ON shared.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "owner updates own notifications"
  ON shared.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
-- No INSERT/DELETE policy: only service_role (edge functions/triggers) can create.

-- Expose via a public-schema view so the JS client doesn't need a custom
-- PostgREST schema config. security_invoker keeps RLS on the base table.
CREATE VIEW public.notifications
WITH (security_invoker = on) AS
  SELECT id, user_id, app, kind, title, body, link, metadata,
         is_read, is_dismissed, created_at
  FROM shared.notifications;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE shared.notifications;
ALTER TABLE shared.notifications REPLICA IDENTITY FULL;

-- Helper: server-side function any edge function or trigger can call to
-- enqueue a notification (uses SECURITY DEFINER so it bypasses RLS).
CREATE OR REPLACE FUNCTION shared.push_notification(
  _user_id uuid,
  _app text,
  _kind text,
  _title text,
  _body text DEFAULT '',
  _link text DEFAULT '',
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO shared.notifications(user_id, app, kind, title, body, link, metadata)
  VALUES (_user_id, _app, _kind, _title, COALESCE(_body,''), COALESCE(_link,''), COALESCE(_metadata,'{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION shared.push_notification(uuid,text,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shared.push_notification(uuid,text,text,text,text,text,jsonb) TO service_role;

COMMENT ON TABLE shared.notifications IS
  'Unified notification feed for Anthem + So1o. Insert only via shared.push_notification() from edge functions or triggers.';