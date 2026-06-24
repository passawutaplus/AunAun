-- Unified notification center (an1hem) alongside So1o legacy notifications.

-- So1o portfolio notifications → so1o schema (keep API path via view)
ALTER TABLE IF EXISTS public.notifications SET SCHEMA so1o;

CREATE OR REPLACE VIEW public.so1o_notifications
WITH (security_invoker = on) AS
  SELECT * FROM so1o.notifications;

GRANT SELECT, UPDATE, INSERT, DELETE ON public.so1o_notifications TO authenticated;
GRANT ALL ON public.so1o_notifications TO service_role;

-- Compatibility: Solo app still uses .from('notifications')
CREATE OR REPLACE VIEW public.notifications
WITH (security_invoker = on) AS
  SELECT * FROM so1o.notifications;

GRANT SELECT, UPDATE, INSERT, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- Ecosystem notifications (both apps)
CREATE TABLE IF NOT EXISTS shared.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  app          text NOT NULL CHECK (app IN ('anthem', 'so1o', 'shared')),
  kind         text NOT NULL,
  title        text NOT NULL,
  body         text NOT NULL DEFAULT '',
  link         text NOT NULL DEFAULT '',
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read      boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON shared.notifications (user_id, is_read, created_at DESC)
  WHERE is_dismissed = false;

GRANT SELECT, UPDATE ON shared.notifications TO authenticated;
GRANT ALL ON shared.notifications TO service_role;

ALTER TABLE shared.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads own notifications" ON shared.notifications;
CREATE POLICY "owner reads own notifications"
  ON shared.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "owner updates own notifications" ON shared.notifications;
CREATE POLICY "owner updates own notifications"
  ON shared.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE VIEW public.ecosystem_notifications
WITH (security_invoker = on) AS
  SELECT id, user_id, app, kind, title, body, link, metadata,
         is_read, is_dismissed, created_at
  FROM shared.notifications;

GRANT SELECT, UPDATE ON public.ecosystem_notifications TO authenticated;

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
DECLARE v_id uuid;
BEGIN
  INSERT INTO shared.notifications(user_id, app, kind, title, body, link, metadata)
  VALUES (_user_id, _app, _kind, _title, COALESCE(_body, ''), COALESCE(_link, ''), COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION shared.push_notification(uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION shared.push_notification(uuid, text, text, text, text, text, jsonb) TO service_role;
