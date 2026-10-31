-- When a collaboration is agreed, its chat becomes a workspace with a starter task list
-- (Brief → references → draft → final). Runs once per chat; people can edit or delete the tasks.
CREATE OR REPLACE FUNCTION shared.seed_collab_starter_tasks(p_conversation_id uuid, p_owner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  IF p_conversation_id IS NULL OR p_owner IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM shared.collab_tasks t WHERE t.conversation_id = p_conversation_id) THEN
    RETURN;
  END IF;
  INSERT INTO shared.collab_tasks (conversation_id, title, position, created_by)
  SELECT p_conversation_id, x.title, extract(epoch FROM now()) + x.ord, p_owner
  FROM (VALUES
    (1, 'ตกลง Brief และขอบเขตงาน'),
    (2, 'แชร์ไฟล์ / ภาพอ้างอิง'),
    (3, 'ส่งงานร่างให้ดู'),
    (4, 'ส่งงานจริง')
  ) AS x(ord, title);
END;
$$;
REVOKE ALL ON FUNCTION shared.seed_collab_starter_tasks(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Request accepted → seed the chat that already exists for it.
CREATE OR REPLACE FUNCTION anthem.collab_request_accepted_seed_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  c record;
BEGIN
  IF NEW.status::text = 'accepted' AND OLD.status::text IS DISTINCT FROM 'accepted' THEN
    FOR c IN SELECT id FROM shared.conversations WHERE kind = 'collab' AND request_id = NEW.id LOOP
      PERFORM shared.seed_collab_starter_tasks(c.id, NEW.recipient_id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS collab_request_accepted_seed_tasks ON anthem.collab_requests;
CREATE TRIGGER collab_request_accepted_seed_tasks
  AFTER UPDATE OF status ON anthem.collab_requests
  FOR EACH ROW EXECUTE FUNCTION anthem.collab_request_accepted_seed_tasks();

-- Chat opened after the request was already accepted → seed it then.
CREATE OR REPLACE FUNCTION shared.collab_conversation_seed_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, anthem, public
AS $$
BEGIN
  IF NEW.kind = 'collab' AND NEW.request_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM anthem.collab_requests r WHERE r.id = NEW.request_id AND r.status::text = 'accepted'
  ) THEN
    PERFORM shared.seed_collab_starter_tasks(NEW.id, NEW.freelancer_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS collab_conversation_seed_tasks ON shared.conversations;
CREATE TRIGGER collab_conversation_seed_tasks
  AFTER INSERT ON shared.conversations
  FOR EACH ROW EXECUTE FUNCTION shared.collab_conversation_seed_tasks();
