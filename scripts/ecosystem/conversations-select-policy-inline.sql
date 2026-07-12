-- Fix conversations INSERT...RETURNING RLS 403 for hire/collab instant chat.
-- SELECT/UPDATE policies must not call shared.user_in_conversation() on the same row
-- being inserted (function SELECTs the row before it is visible → policy false).

DROP POLICY IF EXISTS "Participants can view conversations" ON shared.conversations;
CREATE POLICY "Participants can view conversations"
  ON shared.conversations FOR SELECT TO authenticated
  USING (
    auth.uid() = client_id
    OR auth.uid() = freelancer_id
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM shared.conversation_members m
      WHERE m.conversation_id = conversations.id
        AND m.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Participants can update conversations" ON shared.conversations;
CREATE POLICY "Participants can update conversations"
  ON shared.conversations FOR UPDATE TO authenticated
  USING (
    auth.uid() = client_id
    OR auth.uid() = freelancer_id
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM shared.conversation_members m
      WHERE m.conversation_id = conversations.id
        AND m.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = client_id
    OR auth.uid() = freelancer_id
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM shared.conversation_members m
      WHERE m.conversation_id = conversations.id
        AND m.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Admins view all conversations" ON shared.conversations;
CREATE POLICY "Admins view all conversations"
  ON shared.conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
