-- Review fix (2026-10-09): shared.messages UPDATE was far too open.
-- 1) Policy "Participants can update messages" let ANY participant of a conversation UPDATE ANY message in it
--    (content, sender_id, ...), i.e. rewrite or re-attribute the other person's messages through REST.
--    The app never edits messages directly: read receipts go through mark_conversation_read() and
--    unsending through unsend_message(), both SECURITY DEFINER, so they are unaffected.
-- 2) `authenticated` had table-wide UPDATE, so even the sender-only policy allowed moving one's own
--    message to another conversation (conversation_id) or changing created_at.
--    Table-level UPDATE is revoked; only the columns a client may legitimately change are granted back.

DROP POLICY IF EXISTS "Participants can update messages" ON shared.messages;

DROP POLICY IF EXISTS "Admins can update messages" ON shared.messages;
CREATE POLICY "Admins can update messages" ON shared.messages
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

REVOKE UPDATE ON shared.messages FROM authenticated;
GRANT UPDATE (content, attachment_url, deleted_at) ON shared.messages TO authenticated;
