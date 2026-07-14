-- Group chat: any member can add people they follow (one-way)
-- Also sets creator role=owner on create_group_conversation

CREATE OR REPLACE FUNCTION public.create_group_conversation(p_title text, p_member_ids uuid[])
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
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF p_title IS NULL OR length(trim(p_title)) < 1 OR length(trim(p_title)) > 100 THEN
    RAISE EXCEPTION 'INVALID_TITLE';
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
    client_id, freelancer_id, last_message_at
  )
  VALUES (
    'group', 'group', trim(p_title), _uid,
    _uid, _uid, now()
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

REVOKE ALL ON FUNCTION public.create_group_conversation(text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.add_group_conversation_members(
  p_conversation_id uuid,
  p_member_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public, anthem
AS $$
DECLARE
  _uid uuid := auth.uid();
  _member uuid;
  _all_members uuid[];
  _added integer := 0;
  _existing integer;
  _is_group boolean;
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

  _all_members := array(SELECT DISTINCT unnest(coalesce(p_member_ids, '{}'::uuid[])));
  _all_members := array_remove(_all_members, _uid);

  IF coalesce(array_length(_all_members, 1), 0) < 1 THEN
    RAISE EXCEPTION 'NEED_NEW_MEMBERS';
  END IF;

  SELECT count(*)::integer INTO _existing
  FROM shared.conversation_members
  WHERE conversation_id = p_conversation_id;

  IF _existing + coalesce(array_length(_all_members, 1), 0) > 50 THEN
    RAISE EXCEPTION 'TOO_MANY_MEMBERS';
  END IF;

  FOREACH _member IN ARRAY _all_members LOOP
    IF EXISTS (
      SELECT 1 FROM shared.conversation_members m
      WHERE m.conversation_id = p_conversation_id AND m.user_id = _member
    ) THEN
      CONTINUE;
    END IF;

    -- Inviter must follow invitee (one-way)
    IF NOT EXISTS (
      SELECT 1 FROM anthem.follows f
      WHERE f.follower_id = _uid AND f.following_id = _member
    ) THEN
      RAISE EXCEPTION 'NOT_FOLLOWING';
    END IF;

    INSERT INTO shared.conversation_members (conversation_id, user_id, role, joined_at)
    VALUES (p_conversation_id, _member, 'member', now())
    ON CONFLICT DO NOTHING;

    _added := _added + 1;
  END LOOP;

  IF _added > 0 THEN
    UPDATE shared.conversations
    SET last_message_at = now()
    WHERE id = p_conversation_id;
  END IF;

  RETURN _added;
END;
$$;

REVOKE ALL ON FUNCTION public.add_group_conversation_members(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_group_conversation_members(uuid, uuid[]) TO authenticated, service_role;
