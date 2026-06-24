-- Link studio team chats to anthem.studios for So1o handoff resolution

ALTER TABLE shared.conversations
  ADD COLUMN IF NOT EXISTS studio_id uuid;

CREATE INDEX IF NOT EXISTS conversations_studio_id_idx
  ON shared.conversations (studio_id)
  WHERE studio_id IS NOT NULL;

ALTER TABLE shared.conversations DROP CONSTRAINT IF EXISTS conversations_kind_check;
ALTER TABLE shared.conversations
  ADD CONSTRAINT conversations_kind_check
  CHECK (kind IN ('hire', 'collab', 'group', 'studio'));

COMMENT ON COLUMN shared.conversations.studio_id IS
  'Anthem studio nest id when kind=studio (find_or_create_studio_chat)';

-- RPC: open studio team chat (Anthem useStudioConversation)
CREATE OR REPLACE FUNCTION public.find_or_create_studio_chat(p_studio_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_conv_id uuid;
  v_title text;
  v_member record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.studio_members sm
    WHERE sm.studio_id = p_studio_id AND sm.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'not a studio member';
  END IF;

  SELECT c.id INTO v_conv_id
  FROM shared.conversations c
  WHERE c.kind = 'studio' AND c.studio_id = p_studio_id
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    SELECT s.name INTO v_title FROM public.studios s WHERE s.id = p_studio_id;
    IF v_title IS NULL THEN
      RAISE EXCEPTION 'studio not found';
    END IF;

    INSERT INTO shared.conversations (
      kind,
      conversation_type,
      studio_id,
      title,
      created_by,
      client_id,
      freelancer_id,
      request_id,
      project_title
    ) VALUES (
      'studio',
      'group',
      p_studio_id,
      v_title,
      v_uid,
      v_uid,
      v_uid,
      NULL,
      v_title
    )
    RETURNING id INTO v_conv_id;
  END IF;

  FOR v_member IN
    SELECT sm.user_id, sm.role
    FROM public.studio_members sm
    WHERE sm.studio_id = p_studio_id
  LOOP
    INSERT INTO shared.conversation_members (conversation_id, user_id, role)
    VALUES (
      v_conv_id,
      v_member.user_id,
      CASE
        WHEN v_member.role = 'owner' THEN 'owner'
        WHEN v_member.role = 'admin' THEN 'admin'
        ELSE 'member'
      END
    )
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;

  RETURN v_conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.find_or_create_studio_chat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_studio_chat(uuid) TO authenticated, service_role;
