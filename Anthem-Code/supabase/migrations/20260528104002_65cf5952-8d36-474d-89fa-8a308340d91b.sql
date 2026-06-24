
-- 1) Extend enums
ALTER TYPE public.hire_status ADD VALUE IF NOT EXISTS 'ตอบรับ';
ALTER TYPE public.hire_status ADD VALUE IF NOT EXISTS 'ปฏิเสธ';
ALTER TYPE public.collab_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE public.collab_status ADD VALUE IF NOT EXISTS 'declined';

-- 2) Conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('hire','collab')),
  request_id uuid NOT NULL,
  client_id uuid NOT NULL,
  freelancer_id uuid NOT NULL,
  project_id uuid,
  project_title text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, request_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = freelancer_id);

CREATE POLICY "Participants can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id OR auth.uid() = freelancer_id);

CREATE POLICY "Participants can update conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = freelancer_id);

CREATE INDEX idx_conversations_freelancer ON public.conversations(freelancer_id, last_message_at DESC);
CREATE INDEX idx_conversations_client ON public.conversations(client_id, last_message_at DESC);

-- 3) Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (auth.uid() = c.client_id OR auth.uid() = c.freelancer_id)
  ));

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (auth.uid() = c.client_id OR auth.uid() = c.freelancer_id)
    )
  );

CREATE POLICY "Recipient can mark as read"
  ON public.messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (auth.uid() = c.client_id OR auth.uid() = c.freelancer_id)
  ));

CREATE INDEX idx_messages_conv_time ON public.messages(conversation_id, created_at);

-- 4) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
