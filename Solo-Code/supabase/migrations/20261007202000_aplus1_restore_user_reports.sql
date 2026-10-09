-- Review fix (2026-10-07): restore anthem.user_reports.
-- public.create_report() (the "report this content" button, forum + community + projects)
-- inserts into anthem.user_reports, but that table does not exist in the unified database:
-- it was only ever defined in the old Anthem-Code/supabase/migrations folder (public schema),
-- which is not applied to this project. Every report currently fails.
-- Columns = original definition + evidence_files + the ai_* triage fields create_report writes.

CREATE TABLE IF NOT EXISTS anthem.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN (
    'user', 'project', 'comment', 'studio', 'message', 'job',
    'community_post', 'community_comment', 'forum_topic', 'forum_reply', 'work_review'
  )),
  target_id uuid NOT NULL,
  target_owner_id uuid,
  reason text NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'nsfw', 'copyright', 'scam', 'impersonation', 'other', 'job_spam'
  )),
  details text NOT NULL DEFAULT '',
  evidence_urls text[] NOT NULL DEFAULT '{}',
  evidence_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_note text NOT NULL DEFAULT '',
  resolved_by uuid,
  resolved_at timestamptz,
  ai_priority integer,
  ai_summary text,
  ai_recommendation text,
  ai_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Writes go through create_report() (SECURITY DEFINER, rate-limited); clients only read.
REVOKE ALL ON anthem.user_reports FROM anon, authenticated;
GRANT SELECT ON anthem.user_reports TO authenticated;
GRANT UPDATE (status, admin_note, resolved_by, resolved_at) ON anthem.user_reports TO authenticated;
GRANT DELETE ON anthem.user_reports TO authenticated;
GRANT ALL ON anthem.user_reports TO service_role;

ALTER TABLE anthem.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_reports_select ON anthem.user_reports;
CREATE POLICY user_reports_select ON anthem.user_reports
  FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_reports_admin_update ON anthem.user_reports;
CREATE POLICY user_reports_admin_update ON anthem.user_reports
  FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

DROP POLICY IF EXISTS user_reports_admin_delete ON anthem.user_reports;
CREATE POLICY user_reports_admin_delete ON anthem.user_reports
  FOR DELETE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_user_reports_status_created ON anthem.user_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_target ON anthem.user_reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON anthem.user_reports (reporter_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_report_per_reporter_target
  ON anthem.user_reports (reporter_id, target_type, target_id) WHERE status IN ('open', 'reviewing');

CREATE OR REPLACE FUNCTION anthem.touch_user_reports_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = anthem
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_reports_updated_at ON anthem.user_reports;
CREATE TRIGGER trg_user_reports_updated_at
  BEFORE UPDATE ON anthem.user_reports
  FOR EACH ROW EXECUTE FUNCTION anthem.touch_user_reports_updated_at();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE anthem.user_reports;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
