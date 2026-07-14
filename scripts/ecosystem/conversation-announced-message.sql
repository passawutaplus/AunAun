-- LINE-style announced/pinned message banner in chat header
ALTER TABLE shared.conversations
  ADD COLUMN IF NOT EXISTS announced_message_id uuid,
  ADD COLUMN IF NOT EXISTS announced_text text;

COMMENT ON COLUMN shared.conversations.announced_message_id IS
  'Pinned/announced message shown in chat header (LINE-style)';
COMMENT ON COLUMN shared.conversations.announced_text IS
  'Snapshot of announced message preview text';
