-- Per-user soft-hide (delete from sidebar without destroying chat for the other party)
-- Note: no FK to conversations — shared.conversations may lack a usable unique constraint in prod.
CREATE TABLE IF NOT EXISTS shared.conversation_hides (
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_hides_user ON shared.conversation_hides(user_id, hidden_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON shared.conversation_hides TO authenticated;
GRANT ALL ON shared.conversation_hides TO service_role;

ALTER TABLE shared.conversation_hides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own hides" ON shared.conversation_hides;
CREATE POLICY "Users manage own hides"
  ON shared.conversation_hides FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure pin upsert has a conflict target (was missing PK in some environments)
DELETE FROM shared.conversation_pins a
USING shared.conversation_pins b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.conversation_id = b.conversation_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'shared.conversation_pins'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE shared.conversation_pins
      ADD CONSTRAINT conversation_pins_pkey PRIMARY KEY (user_id, conversation_id);
  END IF;
END $$;

-- Privileges can be lost after schema ops — re-grant for client pin/hide
GRANT SELECT, INSERT, UPDATE, DELETE ON shared.conversation_pins TO authenticated;
GRANT ALL ON shared.conversation_pins TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON shared.conversation_hides TO authenticated;
GRANT ALL ON shared.conversation_hides TO service_role;

ALTER TABLE shared.conversation_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.conversation_hides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own pins" ON shared.conversation_pins;
CREATE POLICY "Users manage own pins"
  ON shared.conversation_pins FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own hides" ON shared.conversation_hides;
CREATE POLICY "Users manage own hides"
  ON shared.conversation_hides FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Re-show chat when the other party sends a new message
CREATE OR REPLACE FUNCTION shared.unhide_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
BEGIN
  DELETE FROM shared.conversation_hides
  WHERE conversation_id = NEW.conversation_id
    AND user_id IS DISTINCT FROM NEW.sender_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unhide_conversation_on_message ON shared.messages;
CREATE TRIGGER trg_unhide_conversation_on_message
  AFTER INSERT ON shared.messages
  FOR EACH ROW
  EXECUTE FUNCTION shared.unhide_conversation_on_message();

DO $pub$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE shared.conversation_hides;
EXCEPTION WHEN duplicate_object THEN NULL;
END $pub$;
ALTER TABLE shared.conversation_hides REPLICA IDENTITY FULL;
