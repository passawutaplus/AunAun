-- Collaboration workspace: a simple To do / Doing / Done board per collab chat.
-- Only the people in the conversation can see or change its tasks.
CREATE TABLE IF NOT EXISTS shared.collab_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES shared.conversations (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  assignee_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  due_date date,
  position double precision NOT NULL DEFAULT extract(epoch FROM now()),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collab_tasks_conversation_idx
  ON shared.collab_tasks (conversation_id, status, position);

ALTER TABLE shared.collab_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON shared.collab_tasks FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON shared.collab_tasks TO authenticated;

DROP POLICY IF EXISTS collab_tasks_select ON shared.collab_tasks;
CREATE POLICY collab_tasks_select ON shared.collab_tasks
  FOR SELECT TO authenticated USING (shared.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS collab_tasks_insert ON shared.collab_tasks;
CREATE POLICY collab_tasks_insert ON shared.collab_tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND shared.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS collab_tasks_update ON shared.collab_tasks;
CREATE POLICY collab_tasks_update ON shared.collab_tasks
  FOR UPDATE TO authenticated
  USING (shared.is_conversation_participant(conversation_id))
  WITH CHECK (shared.is_conversation_participant(conversation_id));

DROP POLICY IF EXISTS collab_tasks_delete ON shared.collab_tasks;
CREATE POLICY collab_tasks_delete ON shared.collab_tasks
  FOR DELETE TO authenticated USING (shared.is_conversation_participant(conversation_id));

CREATE OR REPLACE FUNCTION shared.collab_tasks_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = shared, public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS collab_tasks_touch ON shared.collab_tasks;
CREATE TRIGGER collab_tasks_touch BEFORE UPDATE ON shared.collab_tasks
  FOR EACH ROW EXECUTE FUNCTION shared.collab_tasks_touch();

NOTIFY pgrst, 'reload schema';
