-- Control over collaborator tags (follows 20261013150000_project_collab_invite_notifications):
--   * "Who can tag me": mutual follows (default) or nobody. Private setting, owner-only.
--   * Nobody can tag someone they blocked or who blocked them.
--   * A collaborator can take their name off a work later (status 'withdrawn'; the poster is told).
--   * The poster can cancel a tag nobody has answered yet (the invite is removed, so they may tag again).

CREATE TABLE IF NOT EXISTS anthem.collab_tag_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  allow text NOT NULL DEFAULT 'mutual' CHECK (allow IN ('mutual', 'nobody')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anthem.collab_tag_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collab_tag_settings_own ON anthem.collab_tag_settings;
CREATE POLICY collab_tag_settings_own ON anthem.collab_tag_settings
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON anthem.collab_tag_settings FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON anthem.collab_tag_settings TO authenticated;

ALTER TABLE anthem.project_collab_invites
  DROP CONSTRAINT IF EXISTS project_collab_invites_status_check,
  ADD CONSTRAINT project_collab_invites_status_check
    CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn'));

-- Can the signed-in user tag _target? Mutual follow, _target allows tags, no block either way.
-- Only answers for the caller, so it reveals nothing the tag picker would not show anyway.
CREATE OR REPLACE FUNCTION anthem.can_tag_collaborator(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND _target IS NOT NULL
    AND _target <> (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM anthem.follows f WHERE f.follower_id = (SELECT auth.uid()) AND f.following_id = _target)
    AND EXISTS (SELECT 1 FROM anthem.follows f WHERE f.follower_id = _target AND f.following_id = (SELECT auth.uid()))
    AND COALESCE((SELECT s.allow FROM anthem.collab_tag_settings s WHERE s.user_id = _target), 'mutual') = 'mutual'
    AND NOT EXISTS (
      SELECT 1 FROM anthem.user_blocks b
      WHERE (b.blocker_id = _target AND b.blocked_id = (SELECT auth.uid()))
         OR (b.blocker_id = (SELECT auth.uid()) AND b.blocked_id = _target)
    );
$$;

REVOKE ALL ON FUNCTION anthem.can_tag_collaborator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION anthem.can_tag_collaborator(uuid) TO authenticated;

DROP POLICY IF EXISTS "project_collab_invites_insert_owner" ON anthem.project_collab_invites;
CREATE POLICY "project_collab_invites_insert_owner"
  ON anthem.project_collab_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM anthem.projects p
      WHERE p.id = project_id AND p.owner_id = (SELECT auth.uid())
    )
    AND anthem.can_tag_collaborator(invited_user_id)
  );

-- Who the signed-in user may tag right now (feeds the tag picker).
CREATE OR REPLACE FUNCTION public.list_taggable_collaborators()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
  SELECT f.following_id
  FROM anthem.follows f
  WHERE f.follower_id = (SELECT auth.uid())
    AND anthem.can_tag_collaborator(f.following_id);
$$;

REVOKE ALL ON FUNCTION public.list_taggable_collaborators() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_taggable_collaborators() TO authenticated;

-- A collaborator takes their own name off a work.
CREATE OR REPLACE FUNCTION public.withdraw_project_collab(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  proj record;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'INVALID:กรุณาเข้าสู่ระบบ';
  END IF;

  SELECT id, owner_id, title, collab_user_ids INTO proj
  FROM anthem.projects
  WHERE id = _project_id
  FOR UPDATE;

  IF NOT FOUND OR NOT (uid = ANY (COALESCE(proj.collab_user_ids, '{}'))) THEN
    RAISE EXCEPTION 'INVALID:คุณไม่ได้เป็นผู้ร่วมงานในผลงานนี้';
  END IF;

  UPDATE anthem.projects
  SET collab_user_ids = array_remove(collab_user_ids, uid)
  WHERE id = _project_id;

  UPDATE anthem.project_collab_invites
  SET status = 'withdrawn', responded_at = now()
  WHERE project_id = _project_id AND invited_user_id = uid;

  BEGIN
    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    VALUES (
      proj.owner_id,
      'anthem',
      'project_collab_response',
      'ผู้ร่วมงานถอนชื่อออก',
      anthem.collab_invite_display_name(uid) || ' ถอนชื่อออกจากผลงาน "'
        || left(COALESCE(NULLIF(trim(proj.title), ''), 'ผลงาน'), 120) || '"',
      '/project/' || proj.id::text,
      jsonb_build_object('project_id', proj.id, 'actor_id', uid, 'status', 'withdrawn')
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'withdraw_project_collab notify failed: %', SQLERRM;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_project_collab(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_project_collab(uuid) TO authenticated;

-- The poster cancels a tag that has not been answered. The invitee's notification closes quietly.
CREATE OR REPLACE FUNCTION public.cancel_project_collab_invite(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  uid uuid := auth.uid();
  inv anthem.project_collab_invites%ROWTYPE;
BEGIN
  SELECT i.* INTO inv
  FROM anthem.project_collab_invites i
  JOIN anthem.projects p ON p.id = i.project_id
  WHERE i.id = _invite_id
    AND i.status = 'pending'
    AND p.owner_id = uid
  FOR UPDATE OF i;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID:ไม่พบการแท็กที่ยังรอตอบ';
  END IF;

  DELETE FROM anthem.project_collab_invites WHERE id = _invite_id;

  UPDATE shared.notifications
  SET metadata = metadata || jsonb_build_object('status', 'cancelled')
  WHERE user_id = inv.invited_user_id
    AND kind = 'project_collab_invite'
    AND metadata->>'invite_id' = _invite_id::text;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_project_collab_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_project_collab_invite(uuid) TO authenticated;
