-- Product chat: one direct thread per buyer and seller, with an object card message.
-- Run on the unified database (shared schema).

DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'shared'
    AND t.relname = 'conversations'
    AND c.conname = 'conversations_kind_check';

  IF def IS NULL OR position('''object''' in def) = 0 THEN
    ALTER TABLE shared.conversations DROP CONSTRAINT IF EXISTS conversations_kind_check;
    ALTER TABLE shared.conversations
      ADD CONSTRAINT conversations_kind_check
      CHECK (kind IN ('hire', 'collab', 'group', 'studio', 'object'));
  END IF;
END $$;

DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'shared'
    AND t.relname = 'messages'
    AND c.conname = 'messages_message_type_check';

  IF def IS NULL OR position('''object''' in def) = 0 THEN
    ALTER TABLE shared.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
    ALTER TABLE shared.messages
      ADD CONSTRAINT messages_message_type_check
      CHECK (message_type IN ('text', 'image', 'file', 'project', 'system', 'profile', 'service', 'object'));
  END IF;
END $$;
