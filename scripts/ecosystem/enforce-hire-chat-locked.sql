-- Hard-block new messages when hire post_reject_chat is locked (after 2 reject rounds)
CREATE OR REPLACE FUNCTION shared.enforce_hire_chat_locked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
DECLARE
  _locked boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM shared.conversations c
    JOIN anthem.hiring_requests hr ON hr.id = c.request_id
    WHERE c.id = NEW.conversation_id
      AND COALESCE(c.kind, '') = 'hire'
      AND hr.post_reject_chat = 'locked'
  ) INTO _locked;

  IF _locked THEN
    RAISE EXCEPTION 'HIRE_CHAT_LOCKED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_hire_chat_locked ON shared.messages;
CREATE TRIGGER trg_enforce_hire_chat_locked
  BEFORE INSERT ON shared.messages
  FOR EACH ROW
  EXECUTE FUNCTION shared.enforce_hire_chat_locked();

DO $pub$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE anthem.hiring_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $pub$;
ALTER TABLE anthem.hiring_requests REPLICA IDENTITY FULL;
