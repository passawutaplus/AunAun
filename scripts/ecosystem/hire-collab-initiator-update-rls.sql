-- Instant hire/collab chat: initiator (client/sender) must be able to mark status
-- when opening chat. Previously only freelancer/recipient could UPDATE → RLS 42501.

-- hiring_requests: allow client (and studio admin / admin) to update their rows
DROP POLICY IF EXISTS "Freelancer can update their requests" ON anthem.hiring_requests;
DROP POLICY IF EXISTS "Participants can update hiring requests" ON anthem.hiring_requests;
CREATE POLICY "Participants can update hiring requests"
  ON anthem.hiring_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = freelancer_id
    OR auth.uid() = client_id
    OR (studio_id IS NOT NULL AND public.is_studio_admin(studio_id))
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = freelancer_id
    OR auth.uid() = client_id
    OR (studio_id IS NOT NULL AND public.is_studio_admin(studio_id))
    OR public.has_role(auth.uid(), 'admin')
  );

-- collab_requests: allow sender to update (instant chat marks accepted)
DROP POLICY IF EXISTS "collab recipient update" ON anthem.collab_requests;
DROP POLICY IF EXISTS "collab participants update" ON anthem.collab_requests;
CREATE POLICY "collab participants update"
  ON anthem.collab_requests FOR UPDATE TO authenticated
  USING (
    auth.uid() = recipient_id
    OR auth.uid() = sender_id
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    auth.uid() = recipient_id
    OR auth.uid() = sender_id
    OR public.has_role(auth.uid(), 'admin')
  );
