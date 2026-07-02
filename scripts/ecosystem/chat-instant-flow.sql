-- Instant hire/collab chat: system + profile message types
-- Run on unified Supabase project (shared schema) after chat-phase2.sql

ALTER TABLE shared.messages
  ADD COLUMN IF NOT EXISTS profile_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_messages_profile_user
  ON shared.messages(profile_user_id)
  WHERE profile_user_id IS NOT NULL;

ALTER TABLE shared.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE shared.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'project', 'system', 'profile'));
