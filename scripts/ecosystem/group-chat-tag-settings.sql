-- Group chat tags: hire | collab (optional)
ALTER TABLE shared.conversations
  ADD COLUMN IF NOT EXISTS group_tag text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conversations_group_tag_check'
      AND conrelid = 'shared.conversations'::regclass
  ) THEN
    ALTER TABLE shared.conversations
      ADD CONSTRAINT conversations_group_tag_check
      CHECK (group_tag IS NULL OR group_tag IN ('hire', 'collab'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_title text,
  p_member_ids uuid[],
  p_group_tag text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _conv_id uuid;
  _member uuid;
  _all_members uuid[];
  _tag text := NULLIF(trim(coalesce(p_group_tag, '')), '');
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF p_title IS NULL OR length(trim(p_title)) < 1 OR length(trim(p_title)) > 100 THEN
    RAISE EXCEPTION 'INVALID_TITLE';
  END IF;
  IF _tag IS NOT NULL AND _tag NOT IN ('hire', 'collab') THEN
    RAISE EXCEPTION 'INVALID_GROUP_TAG';
  END IF;

  _all_members := array(SELECT DISTINCT unnest(coalesce(p_member_ids, '{}'::uuid[])));
  _all_members := array_remove(_all_members, _uid);

  IF coalesce(array_length(_all_members, 1), 0) < 1 THEN
    RAISE EXCEPTION 'NEED_OTHER_MEMBERS';
  END IF;
  IF coalesce(array_length(_all_members, 1), 0) > 49 THEN
    RAISE EXCEPTION 'TOO_MANY_MEMBERS';
  END IF;

  INSERT INTO shared.conversations (
    kind, conversation_type, title, created_by,
    client_id, freelancer_id, last_message_at, group_tag
  )
  VALUES (
    'group', 'group', trim(p_title), _uid,
    _uid, _uid, now(), _tag
  )
  RETURNING id INTO _conv_id;

  INSERT INTO shared.conversation_members (conversation_id, user_id, role, joined_at)
  VALUES (_conv_id, _uid, 'owner', now())
  ON CONFLICT DO NOTHING;

  FOREACH _member IN ARRAY _all_members LOOP
    INSERT INTO shared.conversation_members (conversation_id, user_id, role, joined_at)
    VALUES (_conv_id, _member, 'member', now())
    ON CONFLICT DO NOTHING;
  END LOOP;

  IF NOT shared.user_in_conversation(_conv_id, _uid) THEN
    RAISE EXCEPTION 'CREATOR_NOT_MEMBER';
  END IF;

  RETURN _conv_id;
EXCEPTION
  WHEN OTHERS THEN
    IF _conv_id IS NOT NULL THEN
      DELETE FROM shared.conversation_members WHERE conversation_id = _conv_id;
      DELETE FROM shared.conversations WHERE id = _conv_id;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_conversation(text, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[], text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_group_conversation(text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_group_conversation_settings(
  p_conversation_id uuid,
  p_title text DEFAULT NULL,
  p_group_tag text DEFAULT NULL,
  p_clear_group_tag boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _is_group boolean;
  _tag text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF p_conversation_id IS NULL THEN RAISE EXCEPTION 'NOT_A_GROUP'; END IF;

  SELECT COALESCE(c.conversation_type, 'direct') = 'group' OR c.kind = 'group'
  INTO _is_group
  FROM shared.conversations c
  WHERE c.id = p_conversation_id;

  IF _is_group IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'NOT_A_GROUP';
  END IF;

  IF NOT shared.user_in_conversation(p_conversation_id, _uid) THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;

  IF p_title IS NOT NULL THEN
    IF length(trim(p_title)) < 1 OR length(trim(p_title)) > 100 THEN
      RAISE EXCEPTION 'INVALID_TITLE';
    END IF;
    UPDATE shared.conversations SET title = trim(p_title) WHERE id = p_conversation_id;
  END IF;

  IF p_clear_group_tag THEN
    UPDATE shared.conversations SET group_tag = NULL WHERE id = p_conversation_id;
  ELSIF p_group_tag IS NOT NULL THEN
    _tag := NULLIF(trim(p_group_tag), '');
    IF _tag IS NOT NULL AND _tag NOT IN ('hire', 'collab') THEN
      RAISE EXCEPTION 'INVALID_GROUP_TAG';
    END IF;
    UPDATE shared.conversations SET group_tag = _tag WHERE id = p_conversation_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_group_conversation_settings(uuid, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_group_conversation_settings(uuid, text, text, boolean) TO authenticated, service_role;
