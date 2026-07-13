-- Forum attachments with virus-scan gate (applied remotely as aplus1_forum_attachments)

CREATE TABLE IF NOT EXISTS anthem.forum_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES anthem.forum_topics(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES anthem.forum_replies(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN (''image'', ''video'', ''file'')),
  file_name text NOT NULL,
  mime_type text NOT NULL DEFAULT ''application/octet-stream'',
  size_bytes bigint NOT NULL DEFAULT 0 CHECK (size_bytes >= 0 AND size_bytes <= 26214400),
  storage_path text,
  public_url text,
  scan_status text NOT NULL DEFAULT ''pending'' CHECK (scan_status IN (''pending'', ''clean'', ''blocked'')),
  scan_reason text,
  scanned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_attachments_one_parent CHECK (NOT (topic_id IS NOT NULL AND reply_id IS NOT NULL))
);
