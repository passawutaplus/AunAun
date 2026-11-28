-- Redesign step 12 (Chat): what the new chat list and room need from the database.
--   * shared.conversation_prefs — my own settings for one chat: muted, accepted_at (I accepted a chat
--     request), seen_at (I looked at a request without marking its messages read).
--   * A muted chat sends me nothing: no bell row and no push (both new rows and the "bump" of an unread
--     bell row, which also pushes). notify-anthem-chat skips email + LINE for muted people too.
--   * public.chat_unread_rooms() — the red number on the chat button: 1:1 rooms with something new.
--   * public.chat_room_meta(uuid[]) — my prefs + "did I ever write here" + unread count, per room.
-- The old chat keeps working: it reads none of this, and a chat nobody muted behaves as before.
-- Rollback: the "down" block at the end of this file.

-- 1. Per-person chat settings ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS shared.conversation_prefs (
  conversation_id uuid NOT NULL REFERENCES shared.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted boolean NOT NULL DEFAULT false,
  accepted_at timestamptz,
  seen_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_prefs_user_idx
  ON shared.conversation_prefs (user_id);

ALTER TABLE shared.conversation_prefs ENABLE ROW LEVEL SECURITY;

-- Only my own rows; writing also needs me to be in that chat.
DROP POLICY IF EXISTS conversation_prefs_read_own ON shared.conversation_prefs;
CREATE POLICY conversation_prefs_read_own ON shared.conversation_prefs
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS conversation_prefs_insert_own ON shared.conversation_prefs;
CREATE POLICY conversation_prefs_insert_own ON shared.conversation_prefs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND shared.user_in_conversation(conversation_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS conversation_prefs_update_own ON shared.conversation_prefs;
CREATE POLICY conversation_prefs_update_own ON shared.conversation_prefs
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND shared.user_in_conversation(conversation_id, (SELECT auth.uid())));

DROP POLICY IF EXISTS conversation_prefs_delete_own ON shared.conversation_prefs;
CREATE POLICY conversation_prefs_delete_own ON shared.conversation_prefs
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON shared.conversation_prefs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON shared.conversation_prefs TO authenticated;
GRANT ALL ON shared.conversation_prefs TO service_role;

DROP TRIGGER IF EXISTS trg_conversation_prefs_updated_at ON shared.conversation_prefs;
CREATE TRIGGER trg_conversation_prefs_updated_at
  BEFORE UPDATE ON shared.conversation_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Muted chat = no bell row, no push --------------------------------------------------------
-- shared.trg_messages_bump_and_notify either INSERTs a chat.message row or, when one is still
-- unread for that chat, UPDATEs it with a newer created_at (notifications_dispatch_push_bump then
-- pushes). Both are dropped here for a person who muted the chat.

CREATE OR REPLACE FUNCTION shared.skip_muted_chat_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_conv text := NEW.metadata ->> 'conversation_id';
BEGIN
  IF v_conv IS NULL
     OR v_conv !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM shared.conversation_prefs p
    WHERE p.conversation_id = v_conv::uuid
      AND p.user_id = NEW.user_id
      AND p.muted
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notifications_skip_muted_chat ON shared.notifications;
CREATE TRIGGER notifications_skip_muted_chat
  BEFORE INSERT ON shared.notifications
  FOR EACH ROW
  WHEN (NEW.kind = 'chat.message')
  EXECUTE FUNCTION shared.skip_muted_chat_notification();

DROP TRIGGER IF EXISTS notifications_skip_muted_chat_bump ON shared.notifications;
CREATE TRIGGER notifications_skip_muted_chat_bump
  BEFORE UPDATE OF created_at ON shared.notifications
  FOR EACH ROW
  WHEN (NEW.kind = 'chat.message' AND NEW.created_at > OLD.created_at)
  EXECUTE FUNCTION shared.skip_muted_chat_notification();

-- 3. Red number on the chat button: my 1:1 rooms (not hidden, not muted) with an unread message
--    from the other person that is newer than when I last looked at the request.

CREATE OR REPLACE FUNCTION public.chat_unread_rooms()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  WITH me AS (SELECT auth.uid() AS uid)
  SELECT count(*)::int
  FROM shared.conversations c
  CROSS JOIN me
  LEFT JOIN shared.conversation_prefs p
    ON p.conversation_id = c.id AND p.user_id = me.uid
  WHERE (c.client_id = me.uid OR c.freelancer_id = me.uid)
    AND coalesce(c.conversation_type, 'direct') = 'direct'
    AND coalesce(c.kind, '') NOT IN ('group', 'studio')
    AND NOT coalesce(p.muted, false)
    AND NOT EXISTS (
      SELECT 1 FROM shared.conversation_hides h
      WHERE h.conversation_id = c.id AND h.user_id = me.uid
    )
    AND EXISTS (
      SELECT 1 FROM shared.messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id <> me.uid
        AND m.read_at IS NULL
        AND m.deleted_at IS NULL
        AND coalesce(m.message_type, 'text') <> 'system'
        AND m.created_at > coalesce(p.seen_at, '-infinity'::timestamptz)
    );
$$;

REVOKE ALL ON FUNCTION public.chat_unread_rooms() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_unread_rooms() TO authenticated;

-- 4. Per-room facts for the chat list (first 300 ids; rooms I am not in are left out).
--    i_sent: I ever wrote a (non-system) message there — no = it is a chat request to me.

CREATE OR REPLACE FUNCTION public.chat_room_meta(conv_ids uuid[])
RETURNS TABLE (
  conversation_id uuid,
  muted boolean,
  accepted_at timestamptz,
  seen_at timestamptz,
  i_sent boolean,
  unread integer
)
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  ids AS (
    SELECT DISTINCT x.id
    FROM unnest(conv_ids[1:300]) AS x(id)
    CROSS JOIN me
    WHERE x.id IS NOT NULL
      AND me.uid IS NOT NULL
      AND shared.user_in_conversation(x.id, me.uid)
  )
  SELECT
    i.id,
    coalesce(p.muted, false),
    p.accepted_at,
    p.seen_at,
    EXISTS (
      SELECT 1 FROM shared.messages m
      WHERE m.conversation_id = i.id
        AND m.sender_id = me.uid
        AND coalesce(m.message_type, 'text') <> 'system'
    ),
    (
      SELECT count(*)::int FROM shared.messages m
      WHERE m.conversation_id = i.id
        AND m.sender_id <> me.uid
        AND m.read_at IS NULL
        AND m.deleted_at IS NULL
        AND coalesce(m.message_type, 'text') <> 'system'
        AND m.created_at > coalesce(p.seen_at, '-infinity'::timestamptz)
    )
  FROM ids i
  CROSS JOIN me
  LEFT JOIN shared.conversation_prefs p
    ON p.conversation_id = i.id AND p.user_id = me.uid;
$$;

REVOKE ALL ON FUNCTION public.chat_room_meta(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_room_meta(uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- down -----------------------------------------------------------------------------------------
-- DROP FUNCTION IF EXISTS public.chat_room_meta(uuid[]);
-- DROP FUNCTION IF EXISTS public.chat_unread_rooms();
-- DROP TRIGGER IF EXISTS notifications_skip_muted_chat_bump ON shared.notifications;
-- DROP TRIGGER IF EXISTS notifications_skip_muted_chat ON shared.notifications;
-- DROP FUNCTION IF EXISTS shared.skip_muted_chat_notification();
-- DROP TABLE IF EXISTS shared.conversation_prefs;  -- drops everyone's mute / accepted / seen
-- NOTIFY pgrst, 'reload schema';
