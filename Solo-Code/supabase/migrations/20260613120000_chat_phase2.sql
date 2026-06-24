-- Chat UX Phase 2: reply, unsend, project messages, pins, group chat
-- Run on unified Supabase project (shared schema)

-- ── conversations ──
ALTER TABLE shared.conversations
  ADD COLUMN IF NOT EXISTS conversation_type text NOT NULL DEFAULT 'direct'
    CHECK (conversation_type IN ('direct', 'group')),
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE shared.conversations
  ALTER COLUMN request_id DROP NOT NULL;

ALTER TABLE shared.conversations DROP CONSTRAINT IF EXISTS conversations_kind_check;
ALTER TABLE shared.conversations
  ADD CONSTRAINT conversations_kind_check
  CHECK (kind IN ('hire', 'collab', 'group'));

-- ── messages ──
ALTER TABLE shared.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES shared.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'project')),
  ADD COLUMN IF NOT EXISTS project_id uuid;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON shared.messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_project ON shared.messages(project_id) WHERE project_id IS NOT NULL;

-- ── conversation_members (group chat) ──
CREATE TABLE IF NOT EXISTS shared.conversation_members (
  conversation_id uuid NOT NULL REFERENCES shared.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_members_user ON shared.conversation_members(user_id);

-- ── conversation_pins (per-user) ──
CREATE TABLE IF NOT EXISTS shared.conversation_pins (
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES shared.conversations(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_pins_user ON shared.conversation_pins(user_id, pinned_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON shared.conversation_members TO authenticated;
GRANT ALL ON shared.conversation_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON shared.conversation_pins TO authenticated;
GRANT ALL ON shared.conversation_pins TO service_role;

ALTER TABLE shared.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.conversation_pins ENABLE ROW LEVEL SECURITY;

-- Helper: is user a participant (direct or group member)
CREATE OR REPLACE FUNCTION shared.user_in_conversation(conv_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shared.conversations c
    WHERE c.id = conv_id
      AND (
        (COALESCE(c.conversation_type, 'direct') = 'direct'
          AND (c.client_id = uid OR c.freelancer_id = uid))
        OR EXISTS (
          SELECT 1 FROM shared.conversation_members m
          WHERE m.conversation_id = conv_id AND m.user_id = uid
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION shared.user_in_conversation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shared.user_in_conversation(uuid, uuid) TO authenticated, service_role;

-- Update message policies to use helper (drop old participant checks)
DROP POLICY IF EXISTS "Participants can view messages" ON shared.messages;
CREATE POLICY "Participants can view messages"
  ON shared.messages FOR SELECT TO authenticated
  USING (shared.user_in_conversation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Participants can send messages" ON shared.messages;
CREATE POLICY "Participants can send messages"
  ON shared.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND shared.user_in_conversation(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "Recipient can mark as read" ON shared.messages;
CREATE POLICY "Participants can update messages"
  ON shared.messages FOR UPDATE TO authenticated
  USING (shared.user_in_conversation(conversation_id, auth.uid()))
  WITH CHECK (shared.user_in_conversation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Sender can unsend own messages" ON shared.messages;
CREATE POLICY "Sender can unsend own messages"
  ON shared.messages FOR UPDATE TO authenticated
  USING (
    auth.uid() = sender_id
    AND created_at > now() - interval '24 hours'
  )
  WITH CHECK (auth.uid() = sender_id);

-- Conversation policies for groups
DROP POLICY IF EXISTS "Participants can view conversations" ON shared.conversations;
CREATE POLICY "Participants can view conversations"
  ON shared.conversations FOR SELECT TO authenticated
  USING (shared.user_in_conversation(id, auth.uid()));

DROP POLICY IF EXISTS "Participants can create conversations" ON shared.conversations;
CREATE POLICY "Participants can create conversations"
  ON shared.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    OR auth.uid() = client_id
    OR auth.uid() = freelancer_id
  );

DROP POLICY IF EXISTS "Participants can update conversations" ON shared.conversations;
CREATE POLICY "Participants can update conversations"
  ON shared.conversations FOR UPDATE TO authenticated
  USING (shared.user_in_conversation(id, auth.uid()));

-- conversation_members RLS
DROP POLICY IF EXISTS "Members can view conversation members" ON shared.conversation_members;
CREATE POLICY "Members can view conversation members"
  ON shared.conversation_members FOR SELECT TO authenticated
  USING (shared.user_in_conversation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Owner can add members" ON shared.conversation_members;
CREATE POLICY "Owner can add members"
  ON shared.conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared.conversations c
      WHERE c.id = conversation_id
        AND c.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM shared.conversation_members m
      WHERE m.conversation_id = conversation_members.conversation_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

-- conversation_pins RLS
DROP POLICY IF EXISTS "Users manage own pins" ON shared.conversation_pins;
CREATE POLICY "Users manage own pins"
  ON shared.conversation_pins FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Realtime for new tables
DO $pub$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE shared.conversation_pins; EXCEPTION WHEN duplicate_object THEN NULL; END $pub$;
ALTER TABLE shared.conversation_pins REPLICA IDENTITY FULL;
