-- Fix: anthem.project_comments had RLS ON with zero policies → all inserts denied.
-- Symptom: comment toast "สิทธิ์บัญชีนี้ยังทำรายการนี้ไม่ได้…" for every signed-in user.

ALTER TABLE anthem.project_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_comments_public_read" ON anthem.project_comments;
CREATE POLICY "project_comments_public_read"
  ON anthem.project_comments FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "project_comments_author_insert" ON anthem.project_comments;
CREATE POLICY "project_comments_author_insert"
  ON anthem.project_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "project_comments_author_update" ON anthem.project_comments;
CREATE POLICY "project_comments_author_update"
  ON anthem.project_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "project_comments_author_delete" ON anthem.project_comments;
CREATE POLICY "project_comments_author_delete"
  ON anthem.project_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON anthem.project_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON anthem.project_comments TO authenticated;
GRANT ALL ON anthem.project_comments TO service_role;
