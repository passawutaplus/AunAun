-- Anthem community production hardening.
-- Canonical backend migration lives in Solo-Code because both apps share one Supabase project.

CREATE TABLE IF NOT EXISTS shared.user_moderation_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  strikes integer NOT NULL DEFAULT 0 CHECK (strikes >= 0),
  muted_until timestamptz,
  banned_until timestamptz,
  reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('strike', 'mute', 'ban', 'unban', 'report_upheld')),
  source text NOT NULL DEFAULT 'community',
  reason text NOT NULL DEFAULT '',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_user_created
  ON shared.moderation_actions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_active
  ON shared.moderation_actions (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE shared.user_moderation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS moderation_state_own_read ON shared.user_moderation_state;
CREATE POLICY moderation_state_own_read
  ON shared.user_moderation_state FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS moderation_actions_admin_read ON shared.moderation_actions;
CREATE POLICY moderation_actions_admin_read
  ON shared.moderation_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON shared.user_moderation_state TO authenticated;
GRANT SELECT ON shared.moderation_actions TO authenticated;
GRANT ALL ON shared.user_moderation_state, shared.moderation_actions TO service_role;

CREATE OR REPLACE FUNCTION public.check_user_can_post()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  state shared.user_moderation_state%ROWTYPE;
  reason_code text;
  blocked_until timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'UNAUTHENTICATED',
      'banned_until', null, 'strikes', 0
    );
  END IF;

  INSERT INTO shared.user_moderation_state (user_id)
  VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO state
  FROM shared.user_moderation_state
  WHERE user_id = uid;

  IF state.banned_until IS NOT NULL AND state.banned_until > now() THEN
    reason_code := 'BANNED';
    blocked_until := state.banned_until;
  ELSIF state.muted_until IS NOT NULL AND state.muted_until > now() THEN
    reason_code := 'MUTED';
    blocked_until := state.muted_until;
  END IF;

  RETURN jsonb_build_object(
    'allowed', reason_code IS NULL,
    'reason', reason_code,
    'banned_until', blocked_until,
    'strikes', state.strikes
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_profanity_strike(p_context text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  state shared.user_moderation_state%ROWTYPE;
  action_name text := 'strike';
  expiry timestamptz;
  ban_days integer := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF char_length(coalesce(p_context, '')) > 80 THEN RAISE EXCEPTION 'INVALID_CONTEXT'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  INSERT INTO shared.user_moderation_state (user_id)
  VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE shared.user_moderation_state
  SET strikes = strikes + 1, updated_at = now()
  WHERE user_id = uid
  RETURNING * INTO state;

  IF state.strikes >= 5 THEN
    action_name := 'ban';
    ban_days := 7;
    expiry := now() + interval '7 days';
    UPDATE shared.user_moderation_state
    SET banned_until = GREATEST(coalesce(banned_until, now()), expiry),
        reason = 'repeated_profanity',
        updated_at = now()
    WHERE user_id = uid;
  ELSIF state.strikes >= 3 THEN
    action_name := 'mute';
    ban_days := 1;
    expiry := now() + interval '1 day';
    UPDATE shared.user_moderation_state
    SET muted_until = GREATEST(coalesce(muted_until, now()), expiry),
        reason = 'repeated_profanity',
        updated_at = now()
    WHERE user_id = uid;
  END IF;

  INSERT INTO shared.moderation_actions (
    user_id, actor_id, action_type, source, reason, expires_at
  ) VALUES (
    uid, uid, action_name, left(coalesce(p_context, 'community'), 80),
    'profanity', expiry
  );

  RETURN jsonb_build_object(
    'strikes', state.strikes,
    'action', action_name,
    'banned_until', expiry,
    'days', ban_days
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_apply_moderation(
  p_user_id uuid,
  p_action text,
  p_days integer DEFAULT 0,
  p_note text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  admin_uid uuid := auth.uid();
  expiry timestamptz;
BEGIN
  IF admin_uid IS NULL OR NOT public.has_role(admin_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_action NOT IN ('strike', 'mute', 'ban', 'unban', 'report_upheld') THEN
    RAISE EXCEPTION 'INVALID_ACTION';
  END IF;
  IF p_days < 0 OR p_days > 365 THEN RAISE EXCEPTION 'INVALID_DAYS'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  INSERT INTO shared.user_moderation_state (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_action = 'unban' THEN
    UPDATE shared.user_moderation_state
    SET muted_until = null, banned_until = null, reason = null, updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_action = 'strike' OR p_action = 'report_upheld' THEN
    UPDATE shared.user_moderation_state
    SET strikes = strikes + 1, reason = left(coalesce(p_note, p_action), 500), updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_action = 'mute' THEN
    expiry := now() + make_interval(days => GREATEST(p_days, 1));
    UPDATE shared.user_moderation_state
    SET muted_until = expiry, reason = left(coalesce(p_note, 'admin_mute'), 500), updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    expiry := now() + make_interval(days => GREATEST(p_days, 1));
    UPDATE shared.user_moderation_state
    SET banned_until = expiry, reason = left(coalesce(p_note, 'admin_ban'), 500), updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  INSERT INTO shared.moderation_actions (
    user_id, actor_id, action_type, source, reason, expires_at
  ) VALUES (
    p_user_id, admin_uid, p_action, 'admin',
    left(coalesce(p_note, ''), 500), expiry
  );

  RETURN jsonb_build_object('ok', true, 'action', p_action, 'expires_at', expiry);
END;
$$;

REVOKE ALL ON FUNCTION public.check_user_can_post() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_profanity_strike(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_apply_moderation(uuid, text, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_user_can_post() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_profanity_strike(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_moderation(uuid, text, integer, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION anthem.enforce_community_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  state shared.user_moderation_state%ROWTYPE;
  recent_count integer;
  parent_row anthem.community_post_comments%ROWTYPE;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  SELECT * INTO state
  FROM shared.user_moderation_state
  WHERE user_id = uid;

  IF state.banned_until IS NOT NULL AND state.banned_until > now() THEN
    RAISE EXCEPTION 'BANNED_UNTIL:%', state.banned_until;
  END IF;
  IF state.muted_until IS NOT NULL AND state.muted_until > now() THEN
    RAISE EXCEPTION 'MUTED_UNTIL:%', state.muted_until;
  END IF;

  IF TG_TABLE_NAME = 'community_posts' THEN
    NEW.title := btrim(NEW.title);
    NEW.body := btrim(NEW.body);
    IF char_length(NEW.title) < 3 OR char_length(NEW.title) > 120 THEN
      RAISE EXCEPTION 'INVALID_TITLE_LENGTH';
    END IF;
    IF char_length(NEW.body) < 10 OR char_length(NEW.body) > 3000 THEN
      RAISE EXCEPTION 'INVALID_BODY_LENGTH';
    END IF;
    IF coalesce(cardinality(NEW.tags), 0) > 8
      OR coalesce(cardinality(NEW.gallery_urls), 0) > 20
      OR coalesce(cardinality(NEW.video_urls), 0) > 3 THEN
      RAISE EXCEPTION 'COMMUNITY_MEDIA_LIMIT';
    END IF;
    IF TG_OP = 'INSERT' THEN
      PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 1));
      SELECT count(*) INTO recent_count
      FROM anthem.community_posts
      WHERE author_id = uid AND created_at > now() - interval '10 minutes';
      IF recent_count >= 5 THEN RAISE EXCEPTION 'RATE_LIMIT_POSTS'; END IF;
    END IF;
  ELSE
    NEW.content := btrim(NEW.content);
    IF char_length(NEW.content) < 1 OR char_length(NEW.content) > 800 THEN
      RAISE EXCEPTION 'INVALID_COMMENT_LENGTH';
    END IF;
    IF NEW.parent_id IS NOT NULL THEN
      SELECT * INTO parent_row
      FROM anthem.community_post_comments
      WHERE id = NEW.parent_id;
      IF NOT FOUND OR parent_row.post_id <> NEW.post_id THEN
        RAISE EXCEPTION 'INVALID_PARENT_COMMENT';
      END IF;
      NEW.depth := parent_row.depth + 1;
      IF NEW.depth > 2 THEN RAISE EXCEPTION 'MAX_REPLY_DEPTH'; END IF;
    ELSE
      NEW.depth := 0;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 2));
    SELECT count(*) INTO recent_count
    FROM anthem.community_post_comments
    WHERE user_id = uid AND created_at > now() - interval '10 minutes';
    IF recent_count >= 30 THEN RAISE EXCEPTION 'RATE_LIMIT_COMMENTS'; END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_community_posts_enforce_write ON anthem.community_posts;
CREATE TRIGGER trg_community_posts_enforce_write
  BEFORE INSERT OR UPDATE ON anthem.community_posts
  FOR EACH ROW EXECUTE FUNCTION anthem.enforce_community_write();

DROP TRIGGER IF EXISTS trg_community_comments_enforce_write ON anthem.community_post_comments;
CREATE TRIGGER trg_community_comments_enforce_write
  BEFORE INSERT OR UPDATE ON anthem.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION anthem.enforce_community_write();

DROP POLICY IF EXISTS "community_comments_public_read" ON anthem.community_post_comments;
CREATE POLICY "community_comments_public_read"
  ON anthem.community_post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM anthem.community_posts p
      WHERE p.id = post_id
        AND (p.status = 'published' OR p.author_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS community_comments_author_delete ON anthem.community_post_comments;
CREATE POLICY community_comments_author_delete
  ON anthem.community_post_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT DELETE ON anthem.community_post_comments TO authenticated;
REVOKE UPDATE ON anthem.community_posts FROM authenticated;
GRANT UPDATE (
  post_kind, title, body, category, tags, gallery_urls, video_urls,
  question_topic, status, updated_at
) ON anthem.community_posts TO authenticated;

CREATE INDEX IF NOT EXISTS idx_community_posts_feed
  ON anthem.community_posts (status, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_feed
  ON anthem.community_posts (author_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_user_created
  ON anthem.community_post_comments (user_id, created_at DESC);

ALTER TABLE anthem.community_posts REPLICA IDENTITY FULL;
ALTER TABLE anthem.community_post_comments REPLICA IDENTITY FULL;
ALTER TABLE anthem.community_post_likes REPLICA IDENTITY FULL;
DO $publication$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'anthem'
      AND tablename = 'community_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE anthem.community_posts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'anthem'
      AND tablename = 'community_post_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE anthem.community_post_comments;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'anthem'
      AND tablename = 'community_post_likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE anthem.community_post_likes;
  END IF;
END
$publication$;

ALTER TABLE anthem.community_post_views
  ADD COLUMN IF NOT EXISTS view_day date NOT NULL DEFAULT current_date;

WITH ranked_views AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY post_id, user_id, view_day
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM anthem.community_post_views
  WHERE user_id IS NOT NULL
)
DELETE FROM anthem.community_post_views views
USING ranked_views ranked
WHERE views.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_community_post_user_daily_view
  ON anthem.community_post_views (post_id, user_id, view_day)
  WHERE user_id IS NOT NULL;

REVOKE SELECT, INSERT ON anthem.community_post_views FROM anon, authenticated;
DROP POLICY IF EXISTS "community_views_insert" ON anthem.community_post_views;
DROP POLICY IF EXISTS "community_views_read" ON anthem.community_post_views;

CREATE OR REPLACE FUNCTION public.increment_community_post_view(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  uid uuid := auth.uid();
  inserted_count integer := 0;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;

  INSERT INTO anthem.community_post_views (post_id, user_id, view_day)
  SELECT _post_id, uid, current_date
  WHERE EXISTS (
    SELECT 1 FROM anthem.community_posts
    WHERE id = _post_id AND status = 'published'
  )
  ON CONFLICT (post_id, user_id, view_day) WHERE user_id IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 1 THEN
    UPDATE anthem.community_posts
    SET view_count = view_count + 1
    WHERE id = _post_id AND status = 'published';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_community_post_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_community_post_view(uuid) TO authenticated;

CREATE TABLE IF NOT EXISTS anthem.community_notification_receipts (
  kind text NOT NULL,
  source_id uuid NOT NULL,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, source_id, recipient_id)
);
ALTER TABLE anthem.community_notification_receipts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON anthem.community_notification_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.notify_community_event(
  _recipient_id uuid,
  _kind text,
  _title text,
  _body text,
  _link text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared, anthem
AS $$
DECLARE
  uid uuid := auth.uid();
  target_post_id uuid;
  source_id uuid;
  expected_recipient uuid;
  post_author_id uuid;
  parent_author_id uuid;
  actor_name text;
  post_title text;
BEGIN
  IF uid IS NULL OR _recipient_id IS NULL OR _recipient_id = uid THEN RETURN; END IF;
  IF _kind NOT IN ('community_like', 'community_comment', 'community_reply') THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_KIND';
  END IF;

  target_post_id := nullif(_metadata->>'post_id', '')::uuid;
  IF target_post_id IS NULL THEN RAISE EXCEPTION 'MISSING_POST_ID'; END IF;

  SELECT author_id, title INTO post_author_id, post_title
  FROM anthem.community_posts
  WHERE id = target_post_id AND status = 'published';
  IF NOT FOUND THEN RAISE EXCEPTION 'POST_NOT_FOUND'; END IF;

  IF _kind = 'community_like' THEN
    IF NOT EXISTS (
      SELECT 1 FROM anthem.community_post_likes l
      WHERE l.post_id = target_post_id AND l.user_id = uid
    ) THEN RAISE EXCEPTION 'LIKE_NOT_FOUND'; END IF;
    source_id := target_post_id;
    IF _recipient_id <> post_author_id THEN RAISE EXCEPTION 'INVALID_RECIPIENT'; END IF;
  ELSE
    SELECT c.id, parent.user_id
    INTO source_id, parent_author_id
    FROM anthem.community_post_comments c
    LEFT JOIN anthem.community_post_comments parent ON parent.id = c.parent_id
    WHERE c.post_id = target_post_id
      AND c.user_id = uid
      AND c.created_at > now() - interval '5 minutes'
    ORDER BY c.created_at DESC
    LIMIT 1;
    IF source_id IS NULL OR (
      _kind = 'community_reply'
      AND _recipient_id NOT IN (post_author_id, parent_author_id)
    ) OR (
      _kind = 'community_comment'
      AND _recipient_id <> post_author_id
    ) THEN
      RAISE EXCEPTION 'INVALID_RECIPIENT';
    END IF;
  END IF;

  INSERT INTO anthem.community_notification_receipts (
    kind, source_id, recipient_id, actor_id
  ) VALUES (_kind, source_id, _recipient_id, uid)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT coalesce(display_name, username, 'สมาชิก Pixel100')
  INTO actor_name
  FROM public.profiles
  WHERE user_id = uid OR id = uid
  LIMIT 1;

  INSERT INTO shared.notifications (
    user_id, app, kind, title, body, link, metadata, is_read, is_dismissed
  ) VALUES (
    _recipient_id,
    'anthem',
    _kind,
    CASE
      WHEN _kind = 'community_like' THEN 'มีคนถูกใจโพสต์ของคุณ'
      WHEN _kind = 'community_reply' THEN 'มีการตอบกลับความคิดเห็นของคุณ'
      ELSE 'มีความคิดเห็นใหม่'
    END,
    format('%s มีปฏิสัมพันธ์กับ "%s"', coalesce(actor_name, 'สมาชิก Pixel100'), left(post_title, 100)),
    format('/community/%s', target_post_id),
    jsonb_build_object('post_id', target_post_id, 'source_id', source_id),
    false,
    false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.notify_community_event(uuid, text, text, text, text, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_community_event(uuid, text, text, text, text, jsonb)
  TO authenticated;

ALTER TABLE shared.messages
  DROP CONSTRAINT IF EXISTS messages_content_length_check;
ALTER TABLE shared.messages
  ADD CONSTRAINT messages_content_length_check
  CHECK (char_length(coalesce(content, '')) <= 4000);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON shared.messages (conversation_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_kind_request
  ON shared.conversations (kind, request_id)
  WHERE request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION shared.enforce_message_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  recent_count integer;
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF uid IS NULL OR NEW.sender_id <> uid THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF char_length(btrim(coalesce(NEW.content, ''))) = 0 AND NEW.attachment_url IS NULL THEN
    RAISE EXCEPTION 'EMPTY_MESSAGE';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 3));
  SELECT count(*) INTO recent_count
  FROM shared.messages
  WHERE sender_id = uid AND created_at > now() - interval '1 minute';
  IF recent_count >= 60 THEN RAISE EXCEPTION 'RATE_LIMIT_MESSAGES'; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION shared.sync_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared
AS $$
BEGIN
  UPDATE shared.conversations
  SET last_message_at = GREATEST(coalesce(last_message_at, NEW.created_at), NEW.created_at)
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_enforce_write ON shared.messages;
CREATE TRIGGER trg_messages_enforce_write
  BEFORE INSERT ON shared.messages
  FOR EACH ROW EXECUTE FUNCTION shared.enforce_message_write();

DROP TRIGGER IF EXISTS trg_messages_sync_conversation ON shared.messages;
CREATE TRIGGER trg_messages_sync_conversation
  AFTER INSERT ON shared.messages
  FOR EACH ROW EXECUTE FUNCTION shared.sync_conversation_last_message();

DROP POLICY IF EXISTS "Participants can update messages" ON shared.messages;
DROP POLICY IF EXISTS "Sender can unsend own messages" ON shared.messages;
REVOKE UPDATE ON shared.messages FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  updated_count integer;
BEGIN
  IF uid IS NULL
    OR NOT shared.user_in_conversation(p_conversation_id, uid) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE shared.messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id <> uid
    AND read_at IS NULL
    AND deleted_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.unsend_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;

  UPDATE shared.messages
  SET deleted_at = now()
  WHERE id = p_message_id
    AND sender_id = uid
    AND deleted_at IS NULL
    AND created_at > now() - interval '24 hours';

  IF NOT FOUND THEN RAISE EXCEPTION 'MESSAGE_NOT_UNSENDABLE'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unsend_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsend_message(uuid) TO authenticated;

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
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  p_title := btrim(coalesce(p_title, ''));
  IF char_length(p_title) < 1 OR char_length(p_title) > 100 THEN
    RAISE EXCEPTION 'INVALID_TITLE';
  END IF;

  SELECT array_agg(DISTINCT member_id)
  INTO clean_members
  FROM unnest(array_append(coalesce(p_member_ids, '{}'), uid)) member_id
  WHERE member_id IS NOT NULL;

  IF cardinality(clean_members) > 50 THEN RAISE EXCEPTION 'TOO_MANY_MEMBERS'; END IF;

  INSERT INTO shared.conversations (
    kind, conversation_type, title, created_by,
    client_id, freelancer_id, request_id, project_title
  ) VALUES (
    'group', 'group', p_title, uid,
    uid, uid, null, p_title
  )
  RETURNING id INTO conv_id;

  INSERT INTO shared.conversation_members (conversation_id, user_id, role)
  SELECT conv_id, member_id, CASE WHEN member_id = uid THEN 'owner' ELSE 'member' END
  FROM unnest(clean_members) member_id;

  RETURN conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_conversation(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated;
