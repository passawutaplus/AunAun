-- Enforce Realtime channel-level authorization
-- Topics in use:
--   chat_<user_uuid>   → owner only
--   admin_chat_global  → admins only

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_topic_owner_can_read" ON realtime.messages;
DROP POLICY IF EXISTS "admin_chat_global_admin_only" ON realtime.messages;
DROP POLICY IF EXISTS "deny_anon_realtime" ON realtime.messages;

-- Owners can subscribe/receive on their own chat topic
CREATE POLICY "chat_topic_owner_can_read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = ('chat_' || auth.uid()::text))
  OR public.has_role(auth.uid(), 'admin')
);

-- Admins can subscribe to the global admin chat channel
CREATE POLICY "admin_chat_global_admin_only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'admin_chat_global'
  AND public.has_role(auth.uid(), 'admin')
);
