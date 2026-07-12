-- Messages participant policies without shared.user_in_conversation()
-- (avoids RLS helper visibility issues during hire/collab chat seeding).

DROP POLICY IF EXISTS "Participants can view messages" ON shared.messages;
CREATE POLICY "Participants can view messages"
  ON shared.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.client_id = auth.uid()
          OR c.freelancer_id = auth.uid()
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM shared.conversation_members m
            WHERE m.conversation_id = c.id AND m.user_id = auth.uid()
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Participants can send messages" ON shared.messages;
CREATE POLICY "Participants can send messages"
  ON shared.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM shared.conversations c
      WHERE c.id = conversation_id
        AND (
          c.client_id = auth.uid()
          OR c.freelancer_id = auth.uid()
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM shared.conversation_members m
            WHERE m.conversation_id = c.id AND m.user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Participants can update messages" ON shared.messages;
CREATE POLICY "Participants can update messages"
  ON shared.messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.client_id = auth.uid()
          OR c.freelancer_id = auth.uid()
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM shared.conversation_members m
            WHERE m.conversation_id = c.id AND m.user_id = auth.uid()
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.client_id = auth.uid()
          OR c.freelancer_id = auth.uid()
          OR c.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM shared.conversation_members m
            WHERE m.conversation_id = c.id AND m.user_id = auth.uid()
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );
