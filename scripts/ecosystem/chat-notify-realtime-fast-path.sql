-- Fast path: bump conversation, in-app chat notification, enable realtime for bell/list/likes
-- Applied to remote via Supabase MCP (chat_notify_realtime_fast_path). Keep for source of truth.

CREATE OR REPLACE FUNCTION shared.trg_messages_bump_and_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  recipient uuid;
  recipients uuid[] := '{}';
  sender_name text;
  preview text;
  title_text text;
  conv shared.conversations%ROWTYPE;
  existing_id uuid;
  is_group boolean;
BEGIN
  UPDATE shared.conversations
  SET last_message_at = COALESCE(NEW.created_at, now())
  WHERE id = NEW.conversation_id;

  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.message_type IS NOT NULL AND NEW.message_type = 'system' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO conv FROM shared.conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  is_group := COALESCE(conv.conversation_type, '') = 'group'
    OR COALESCE(conv.kind, '') IN ('group', 'studio');

  IF is_group THEN
    SELECT COALESCE(array_agg(cm.user_id), '{}')
    INTO recipients
    FROM shared.conversation_members cm
    WHERE cm.conversation_id = NEW.conversation_id
      AND cm.user_id IS DISTINCT FROM NEW.sender_id;
  ELSE
    IF conv.client_id IS NOT NULL AND conv.client_id IS DISTINCT FROM NEW.sender_id THEN
      recipients := array_append(recipients, conv.client_id);
    END IF;
    IF conv.freelancer_id IS NOT NULL AND conv.freelancer_id IS DISTINCT FROM NEW.sender_id THEN
      recipients := array_append(recipients, conv.freelancer_id);
    END IF;
  END IF;

  IF cardinality(recipients) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.display_name, 'มีข้อความใหม่')
  INTO sender_name
  FROM public.profiles p
  WHERE p.user_id = NEW.sender_id
  LIMIT 1;

  IF sender_name IS NULL THEN
    SELECT COALESCE(p.display_name, 'มีข้อความใหม่')
    INTO sender_name
    FROM public.profiles p
    WHERE p.id = NEW.sender_id
    LIMIT 1;
  END IF;
  sender_name := COALESCE(sender_name, 'มีข้อความใหม่');

  preview := left(COALESCE(NULLIF(btrim(COALESCE(NEW.content, '')), ''), '(ไฟล์แนบ)'), 120);
  title_text := sender_name || ' ส่งข้อความ';

  FOREACH recipient IN ARRAY recipients LOOP
    SELECT n.id INTO existing_id
    FROM shared.notifications n
    WHERE n.user_id = recipient
      AND n.kind = 'chat.message'
      AND COALESCE(n.is_dismissed, false) = false
      AND COALESCE(n.is_read, false) = false
      AND n.metadata->>'conversation_id' = NEW.conversation_id::text
    ORDER BY n.created_at DESC
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
      UPDATE shared.notifications
      SET
        title = title_text,
        body = preview,
        link = '/chat/' || NEW.conversation_id::text,
        metadata = jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'sender_id', NEW.sender_id,
          'idempotency_key', 'chat-' || NEW.id::text
        ),
        created_at = now()
      WHERE id = existing_id;
    ELSE
      INSERT INTO shared.notifications (
        user_id, app, kind, title, body, link, metadata, is_read, is_dismissed
      ) VALUES (
        recipient,
        'anthem',
        'chat.message',
        title_text,
        preview,
        '/chat/' || NEW.conversation_id::text,
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'sender_id', NEW.sender_id,
          'idempotency_key', 'chat-' || NEW.id::text
        ),
        false,
        false
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messages_bump_and_notify ON shared.messages;
CREATE TRIGGER trg_messages_bump_and_notify
  AFTER INSERT ON shared.messages
  FOR EACH ROW
  EXECUTE FUNCTION shared.trg_messages_bump_and_notify();

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE shared.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE shared.conversations;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE anthem.project_likes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
