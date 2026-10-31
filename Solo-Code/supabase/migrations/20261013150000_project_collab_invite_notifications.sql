-- Collaborator tags on a work ("แท็กเพื่อนร่วมงาน"):
--   * The tagged person is notified by the server once the work is Published (never for a draft),
--     with text built here, not by the client.
--   * The poster is notified when the tag is accepted or declined. Declining never blocks the work;
--     only accepted people are written to projects.collab_user_ids (respond_project_collab_invite).
--   * Only mutual follows can be tagged, enforced here as well as in the editor.
--   * Invitees could UPDATE their invite row directly (any column, e.g. project_id), then accept it
--     through the RPC and get their name onto someone else's work. Responses now go through the RPC only.
--
-- Before this, invite notifications were sent from the browser through notify_community_event, which
-- does not exist in production, so nobody was ever told they had been tagged.

ALTER TABLE anthem.project_collab_invites
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- Orphan invites would otherwise survive a deleted work.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'anthem.project_collab_invites'::regclass
      AND conname = 'project_collab_invites_project_id_fkey'
  ) THEN
    ALTER TABLE anthem.project_collab_invites
      ADD CONSTRAINT project_collab_invites_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES anthem.projects (id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- Only people who follow each other can be tagged (the editor already shows only them; the
-- database now holds the same line, so the API cannot be used to tag-spam strangers).
DROP POLICY IF EXISTS "project_collab_invites_insert_owner" ON anthem.project_collab_invites;
CREATE POLICY "project_collab_invites_insert_owner"
  ON anthem.project_collab_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = (SELECT auth.uid())
    AND invited_user_id <> (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM anthem.projects p
      WHERE p.id = project_id AND p.owner_id = (SELECT auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM anthem.follows f
      WHERE f.follower_id = (SELECT auth.uid()) AND f.following_id = invited_user_id
    )
    AND EXISTS (
      SELECT 1 FROM anthem.follows f
      WHERE f.follower_id = invited_user_id AND f.following_id = (SELECT auth.uid())
    )
  );

-- Responses go through public.respond_project_collab_invite (SECURITY DEFINER) only.
DROP POLICY IF EXISTS "project_collab_invites_update_invitee" ON anthem.project_collab_invites;
REVOKE UPDATE, DELETE ON anthem.project_collab_invites FROM authenticated;
REVOKE ALL ON anthem.project_collab_invites FROM anon;

CREATE OR REPLACE FUNCTION anthem.collab_invite_display_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
  SELECT COALESCE(
    (
      SELECT COALESCE(NULLIF(trim(p.display_name), ''), NULLIF(trim(p.username), ''))
      FROM public.profiles p
      WHERE p.user_id = _user_id
      LIMIT 1
    ),
    'ครีเอเตอร์'
  );
$$;

REVOKE ALL ON FUNCTION anthem.collab_invite_display_name(uuid) FROM PUBLIC, anon, authenticated;

-- Tell every pending, not-yet-notified invitee of a Published work. Safe to call repeatedly.
CREATE OR REPLACE FUNCTION anthem.notify_project_collab_invitees(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  proj record;
  inv record;
  owner_name text;
BEGIN
  SELECT id, title, owner_id, status INTO proj FROM anthem.projects WHERE id = _project_id;
  IF NOT FOUND OR proj.status IS DISTINCT FROM 'Published' THEN
    RETURN;
  END IF;

  owner_name := anthem.collab_invite_display_name(proj.owner_id);

  FOR inv IN
    UPDATE anthem.project_collab_invites i
    SET notified_at = now()
    WHERE i.project_id = _project_id
      AND i.status = 'pending'
      AND i.notified_at IS NULL
      AND i.invited_user_id <> proj.owner_id
    RETURNING i.id, i.invited_user_id
  LOOP
    BEGIN
      INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
      VALUES (
        inv.invited_user_id,
        'anthem',
        'project_collab_invite',
        'มีคนแท็กคุณเป็นผู้ร่วมงาน',
        owner_name || ' แท็กคุณในผลงาน "' || left(COALESCE(NULLIF(trim(proj.title), ''), 'ผลงาน'), 120)
          || '" — กดยอมรับเพื่อให้ชื่อคุณขึ้นในผลงาน',
        '/project/' || proj.id::text,
        jsonb_build_object(
          'invite_id', inv.id,
          'project_id', proj.id,
          'actor_id', proj.owner_id,
          'status', 'pending'
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Never block publishing or tagging because of a notification problem.
      RAISE WARNING 'notify_project_collab_invitees failed: %', SQLERRM;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION anthem.notify_project_collab_invitees(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION anthem.trg_collab_invite_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  PERFORM anthem.notify_project_collab_invitees(NEW.project_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION anthem.trg_collab_invite_created() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_collab_invite_created ON anthem.project_collab_invites;
CREATE TRIGGER trg_collab_invite_created
  AFTER INSERT ON anthem.project_collab_invites
  FOR EACH ROW EXECUTE FUNCTION anthem.trg_collab_invite_created();

-- Tags saved while the work was a draft are announced when it is published.
CREATE OR REPLACE FUNCTION anthem.trg_project_published_collab_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  IF NEW.status = 'Published' AND OLD.status IS DISTINCT FROM 'Published' THEN
    PERFORM anthem.notify_project_collab_invitees(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION anthem.trg_project_published_collab_invites() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_project_published_collab_invites ON anthem.projects;
CREATE TRIGGER trg_project_published_collab_invites
  AFTER UPDATE OF status ON anthem.projects
  FOR EACH ROW EXECUTE FUNCTION anthem.trg_project_published_collab_invites();

-- Accept / decline: close the invitee's notification and tell the poster.
CREATE OR REPLACE FUNCTION anthem.trg_collab_invite_responded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  proj_title text;
  invitee_name text;
BEGIN
  IF OLD.status <> 'pending' OR NEW.status NOT IN ('accepted', 'declined') THEN
    RETURN NEW;
  END IF;

  BEGIN
    UPDATE shared.notifications
    SET metadata = metadata || jsonb_build_object('status', NEW.status)
    WHERE user_id = NEW.invited_user_id
      AND kind = 'project_collab_invite'
      AND metadata->>'invite_id' = NEW.id::text;

    SELECT left(COALESCE(NULLIF(trim(title), ''), 'ผลงาน'), 120) INTO proj_title
    FROM anthem.projects WHERE id = NEW.project_id;
    invitee_name := anthem.collab_invite_display_name(NEW.invited_user_id);

    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    VALUES (
      NEW.invited_by,
      'anthem',
      'project_collab_response',
      CASE WHEN NEW.status = 'accepted' THEN 'ผู้ร่วมงานยืนยันแล้ว' ELSE 'ผู้ร่วมงานปฏิเสธการแท็ก' END,
      CASE WHEN NEW.status = 'accepted'
        THEN invitee_name || ' ยอมรับการแท็กใน "' || COALESCE(proj_title, 'ผลงาน') || '" ชื่อขึ้นในผลงานแล้ว'
        ELSE invitee_name || ' ปฏิเสธการแท็กใน "' || COALESCE(proj_title, 'ผลงาน') || '" ผลงานยังเผยแพร่ตามปกติ แต่จะไม่มีชื่อนี้'
      END,
      '/project/' || NEW.project_id::text,
      jsonb_build_object(
        'invite_id', NEW.id,
        'project_id', NEW.project_id,
        'actor_id', NEW.invited_user_id,
        'status', NEW.status
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'trg_collab_invite_responded failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION anthem.trg_collab_invite_responded() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_collab_invite_responded ON anthem.project_collab_invites;
CREATE TRIGGER trg_collab_invite_responded
  AFTER UPDATE OF status ON anthem.project_collab_invites
  FOR EACH ROW EXECUTE FUNCTION anthem.trg_collab_invite_responded();
