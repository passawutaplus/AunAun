-- Checklist UX gap-close: comment edit/delete, chat reactions.
-- Apply via existing ecosystem SQL push when ready.

ALTER TABLE anthem.community_post_comments
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

DROP POLICY IF EXISTS "community_comments_author_update" ON anthem.community_post_comments;
CREATE POLICY "community_comments_author_update"
  ON anthem.community_post_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "community_comments_author_delete" ON anthem.community_post_comments;
CREATE POLICY "community_comments_author_delete"
  ON anthem.community_post_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.community_post_comments TO authenticated;

CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 16),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_reactions_read" ON public.message_reactions;
CREATE POLICY "message_reactions_read"
  ON public.message_reactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "message_reactions_insert" ON public.message_reactions;
CREATE POLICY "message_reactions_insert"
  ON public.message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "message_reactions_delete" ON public.message_reactions;
CREATE POLICY "message_reactions_delete"
  ON public.message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;

-- Project comment like / dislike (one vote per user)
CREATE TABLE IF NOT EXISTS anthem.project_comment_votes (
  comment_id uuid NOT NULL REFERENCES anthem.project_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (1, -1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_comment_votes_comment
  ON anthem.project_comment_votes (comment_id);

ALTER TABLE anthem.project_comment_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_comment_votes_read" ON anthem.project_comment_votes;
CREATE POLICY "project_comment_votes_read"
  ON anthem.project_comment_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "project_comment_votes_write" ON anthem.project_comment_votes;
CREATE POLICY "project_comment_votes_write"
  ON anthem.project_comment_votes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM anthem.project_comments c
      WHERE c.id = comment_id AND c.user_id = auth.uid()
    )
  );

GRANT SELECT ON anthem.project_comment_votes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON anthem.project_comment_votes TO authenticated;

