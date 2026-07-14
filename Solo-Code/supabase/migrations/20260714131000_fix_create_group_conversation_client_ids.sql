-- Hotfix: create_group_conversation must set client_id/freelancer_id (NOT NULL)

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
