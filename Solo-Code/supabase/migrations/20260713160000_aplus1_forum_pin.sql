-- Pin topics for Aplus1 forum
ALTER TABLE anthem.forum_topics
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_forum_topics_pinned
  ON anthem.forum_topics (is_pinned DESC, pinned_at DESC NULLS LAST, last_activity_at DESC);
