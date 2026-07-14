-- Chat settings: auto-reply (hire/collab) + blocked list uses existing anthem.user_blocks
-- Canonical: Solo-Code/supabase/migrations/20260714140000_chat_settings_auto_reply.sql

CREATE TABLE IF NOT EXISTS anthem.chat_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  hire_auto_reply_enabled boolean NOT NULL DEFAULT false,
  hire_auto_reply_text text NOT NULL DEFAULT '',
  hire_auto_reply_image_url text,
  hire_auto_reply_link_url text,
  collab_auto_reply_enabled boolean NOT NULL DEFAULT false,
  collab_auto_reply_text text NOT NULL DEFAULT '',
  collab_auto_reply_image_url text,
  collab_auto_reply_link_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_settings_hire_text_len CHECK (char_length(hire_auto_reply_text) <= 1000),
  CONSTRAINT chat_settings_collab_text_len CHECK (char_length(collab_auto_reply_text) <= 1000),
  CONSTRAINT chat_settings_hire_link_len CHECK (hire_auto_reply_link_url IS NULL OR char_length(hire_auto_reply_link_url) <= 500),
  CONSTRAINT chat_settings_collab_link_len CHECK (collab_auto_reply_link_url IS NULL OR char_length(collab_auto_reply_link_url) <= 500)
);

ALTER TABLE anthem.chat_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_settings_own" ON anthem.chat_settings;
CREATE POLICY "chat_settings_own"
  ON anthem.chat_settings FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.chat_settings TO authenticated;
GRANT ALL ON anthem.chat_settings TO service_role;

CREATE OR REPLACE FUNCTION public.maybe_send_chat_auto_reply(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _kind text;
  _freelancer uuid;
  _enabled boolean := false;
  _text text := '';
  _image text;
  _link text;
  _content text;
  _existing integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF p_conversation_id IS NULL THEN RETURN false; END IF;

  IF NOT shared.user_in_conversation(p_conversation_id, _uid) THEN
    RAISE EXCEPTION 'NOT_A_MEMBER';
  END IF;

  SELECT c.kind::text, c.freelancer_id
  INTO _kind, _freelancer
  FROM shared.conversations c
  WHERE c.id = p_conversation_id;

  IF _freelancer IS NULL OR _kind IS NULL OR _kind NOT IN ('hire', 'collab') THEN
    RETURN false;
  END IF;

  SELECT count(*)::integer INTO _existing
  FROM shared.messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id = _freelancer
    AND m.deleted_at IS NULL;

  IF coalesce(_existing, 0) > 0 THEN
    RETURN false;
  END IF;

  IF _kind = 'hire' THEN
    SELECT
      s.hire_auto_reply_enabled,
      s.hire_auto_reply_text,
      s.hire_auto_reply_image_url,
      s.hire_auto_reply_link_url
    INTO _enabled, _text, _image, _link
    FROM anthem.chat_settings s
    WHERE s.user_id = _freelancer;
  ELSE
    SELECT
      s.collab_auto_reply_enabled,
      s.collab_auto_reply_text,
      s.collab_auto_reply_image_url,
      s.collab_auto_reply_link_url
    INTO _enabled, _text, _image, _link
    FROM anthem.chat_settings s
    WHERE s.user_id = _freelancer;
  END IF;

  IF NOT FOUND OR NOT coalesce(_enabled, false) THEN
    RETURN false;
  END IF;

  _content := trim(coalesce(_text, ''));
  IF _link IS NOT NULL AND length(trim(_link)) > 0 THEN
    IF length(_content) > 0 THEN
      _content := _content || E'\n' || trim(_link);
    ELSE
      _content := trim(_link);
    END IF;
  END IF;

  IF length(_content) = 0 AND (_image IS NULL OR length(trim(_image)) = 0) THEN
    RETURN false;
  END IF;

  IF length(_content) > 0 THEN
    INSERT INTO shared.messages (conversation_id, sender_id, content, message_type)
    VALUES (p_conversation_id, _freelancer, left(_content, 4000), 'text');
  END IF;

  IF _image IS NOT NULL AND length(trim(_image)) > 0 THEN
    INSERT INTO shared.messages (conversation_id, sender_id, content, attachment_url, message_type)
    VALUES (p_conversation_id, _freelancer, '', trim(_image), 'image');
  END IF;

  UPDATE shared.conversations
  SET last_message_at = now()
  WHERE id = p_conversation_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.maybe_send_chat_auto_reply(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.maybe_send_chat_auto_reply(uuid) TO authenticated, service_role;
