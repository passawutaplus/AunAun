-- Fix group chat visibility: creator membership, backfill orphans, hardened RPC.
-- Addresses: create group -> redirect OK but inbox/thread not found.

-- 1) Recognize group creators even if membership row is missing (safety net for RLS).
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
        (
          COALESCE(c.conversation_type, 'direct') = 'direct'
          AND (c.client_id = uid OR c.freelancer_id = uid)
        )
        OR (
          COALESCE(c.conversation_type, 'direct') = 'group'
          AND c.created_by = uid
        )
        OR EXISTS (
          SELECT 1
          FROM shared.conversation_members m
          WHERE m.conversation_id = conv_id
            AND m.user_id = uid
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION shared.user_in_conversation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION shared.user_in_conversation(uuid, uuid) TO authenticated, service_role;

-- 2) Backfill: group creators must be in conversation_members for inbox listing.
INSERT INTO shared.conversation_members (conversation_id, user_id, role)
SELECT c.id, c.created_by, 'owner'
FROM shared.conversations c
WHERE COALESCE(c.conversation_type, 'direct') = 'group'
  AND c.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM shared.conversation_members m
    WHERE m.conversation_id = c.id
      AND m.user_id = c.created_by
  )
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- 3) Atomic group creation with membership verification.
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_title text,
  p_member_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  conv_id uuid;
  clean_members uuid[];
  member_count integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  p_title := btrim(coalesce(p_title, ''));
  IF char_length(p_title) < 1 OR char_length(p_title) > 100 THEN
    RAISE EXCEPTION 'INVALID_TITLE';
  END IF;

  SELECT array_agg(DISTINCT member_id ORDER BY member_id)
  INTO clean_members
  FROM unnest(array_append(coalesce(p_member_ids, '{}'), uid)) AS member_id
  WHERE member_id IS NOT NULL;

  IF clean_members IS NULL OR cardinality(clean_members) < 2 THEN
    RAISE EXCEPTION 'NEED_OTHER_MEMBERS';
  END IF;

  IF cardinality(clean_members) > 50 THEN
    RAISE EXCEPTION 'TOO_MANY_MEMBERS';
  END IF;

  INSERT INTO shared.conversations (
    kind,
    conversation_type,
    title,
    created_by,
    client_id,
    freelancer_id,
    request_id,
    project_title,
    last_message_at
  ) VALUES (
    'group',
    'group',
    p_title,
    uid,
    NULL,
    NULL,
    NULL,
    p_title,
    now()
  )
  RETURNING id INTO conv_id;

  INSERT INTO shared.conversation_members (conversation_id, user_id, role)
  SELECT conv_id, member_id, CASE WHEN member_id = uid THEN 'owner' ELSE 'member' END
  FROM unnest(clean_members) AS member_id
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  SELECT count(*)::integer
  INTO member_count
  FROM shared.conversation_members
  WHERE conversation_id = conv_id;

  IF member_count < cardinality(clean_members) THEN
    RAISE EXCEPTION 'MEMBERSHIP_INSERT_FAILED';
  END IF;

  IF NOT shared.user_in_conversation(conv_id, uid) THEN
    RAISE EXCEPTION 'CREATOR_NOT_MEMBER';
  END IF;

  RETURN conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_conversation(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated;
