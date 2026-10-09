-- Forum attachments with virus-scan gate (applied remotely as aplus1_forum_attachments)

CREATE TABLE IF NOT EXISTS anthem.forum_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES anthem.forum_topics(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES anthem.forum_replies(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image', 'video', 'file')),
  file_name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint NOT NULL DEFAULT 0 CHECK (size_bytes >= 0 AND size_bytes <= 26214400),
  storage_path text,
  public_url text,
  scan_status text NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'blocked')),
  scan_reason text,
  scanned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_attachments_one_parent CHECK (NOT (topic_id IS NOT NULL AND reply_id IS NOT NULL))
);

-- Reconstructed from production on 2026-10-07 so a fresh database matches remote.
CREATE INDEX IF NOT EXISTS idx_forum_attachments_topic ON anthem.forum_attachments (topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_attachments_reply ON anthem.forum_attachments (reply_id) WHERE reply_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_attachments_author ON anthem.forum_attachments (author_id, created_at DESC);

ALTER TABLE anthem.forum_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_attachments_select ON anthem.forum_attachments;
CREATE POLICY forum_attachments_select ON anthem.forum_attachments
  FOR SELECT TO anon, authenticated
  USING (scan_status = 'clean' OR author_id = auth.uid());

DROP POLICY IF EXISTS forum_attachments_admin_select ON anthem.forum_attachments;
CREATE POLICY forum_attachments_admin_select ON anthem.forum_attachments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS forum_attachments_insert ON anthem.forum_attachments;
CREATE POLICY forum_attachments_insert ON anthem.forum_attachments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS forum_attachments_update ON anthem.forum_attachments;
CREATE POLICY forum_attachments_update ON anthem.forum_attachments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS forum_attachments_delete ON anthem.forum_attachments;
CREATE POLICY forum_attachments_delete ON anthem.forum_attachments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid());

GRANT SELECT ON anthem.forum_attachments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.forum_attachments TO authenticated;
GRANT ALL ON anthem.forum_attachments TO service_role;
