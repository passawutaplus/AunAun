-- Portfolio ↔ community post linking + mutual-follow collab invites

ALTER TABLE anthem.projects
  ADD COLUMN IF NOT EXISTS linked_community_post_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS collab_user_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_projects_linked_posts_gin
  ON anthem.projects USING gin (linked_community_post_ids);

CREATE INDEX IF NOT EXISTS idx_projects_collab_users_gin
  ON anthem.projects USING gin (collab_user_ids);

CREATE TABLE IF NOT EXISTS anthem.project_collab_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  invited_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (project_id, invited_user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_collab_invites_user
  ON anthem.project_collab_invites (invited_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_collab_invites_project
  ON anthem.project_collab_invites (project_id, status);

ALTER TABLE anthem.project_collab_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_collab_invites_select" ON anthem.project_collab_invites;
CREATE POLICY "project_collab_invites_select"
  ON anthem.project_collab_invites FOR SELECT
  USING (
    invited_user_id = auth.uid()
    OR invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM anthem.projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "project_collab_invites_insert_owner" ON anthem.project_collab_invites;
CREATE POLICY "project_collab_invites_insert_owner"
  ON anthem.project_collab_invites FOR INSERT
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM anthem.projects p
      WHERE p.id = project_id AND p.owner_id = auth.uid()
    )
    AND invited_user_id <> auth.uid()
  );

DROP POLICY IF EXISTS "project_collab_invites_update_invitee" ON anthem.project_collab_invites;
CREATE POLICY "project_collab_invites_update_invitee"
  ON anthem.project_collab_invites FOR UPDATE
  USING (invited_user_id = auth.uid())
  WITH CHECK (invited_user_id = auth.uid());

-- Respond to collab invite: accept adds user + links their posts mentioning this project
CREATE OR REPLACE FUNCTION public.respond_project_collab_invite(
  _invite_id uuid,
  _accept boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public, shared
AS $$
DECLARE
  inv anthem.project_collab_invites%ROWTYPE;
  post_rec record;
  post_count int := 0;
BEGIN
  SELECT * INTO inv
  FROM anthem.project_collab_invites
  WHERE id = _invite_id
    AND invited_user_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID:ไม่พบคำเชิญหรือตอบรับแล้ว';
  END IF;

  UPDATE anthem.project_collab_invites
  SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END,
      responded_at = now()
  WHERE id = _invite_id;

  IF NOT _accept THEN
    RETURN;
  END IF;

  UPDATE anthem.projects
  SET collab_user_ids = (
    SELECT array_agg(DISTINCT x)
    FROM unnest(COALESCE(collab_user_ids, '{}') || ARRAY[inv.invited_user_id]) AS x
  )
  WHERE id = inv.project_id;

  FOR post_rec IN
    SELECT cp.id
    FROM anthem.community_posts cp
    WHERE cp.author_id = inv.invited_user_id
      AND cp.status = 'published'
      AND cp.mentioned_project_ids @> ARRAY[inv.project_id]
    ORDER BY cp.created_at DESC
  LOOP
    UPDATE anthem.projects
    SET linked_community_post_ids = (
      SELECT array_agg(DISTINCT x)
      FROM unnest(COALESCE(linked_community_post_ids, '{}') || ARRAY[post_rec.id]) AS x
    )
    WHERE id = inv.project_id;
    post_count := post_count + 1;
  END LOOP;

  IF post_count = 0 THEN
    SELECT cp.id INTO post_rec
    FROM anthem.community_posts cp
    WHERE cp.author_id = inv.invited_user_id
      AND cp.status = 'published'
    ORDER BY cp.created_at DESC
    LIMIT 1;

    IF FOUND THEN
      UPDATE anthem.projects
      SET linked_community_post_ids = (
        SELECT array_agg(DISTINCT x)
        FROM unnest(COALESCE(linked_community_post_ids, '{}') || ARRAY[post_rec.id]) AS x
      )
      WHERE id = inv.project_id;

      UPDATE anthem.community_posts
      SET mentioned_project_ids = (
        SELECT array_agg(DISTINCT x)
        FROM unnest(
          COALESCE(mentioned_project_ids, '{}') || ARRAY[inv.project_id]
        ) AS x
      ),
      updated_at = now()
      WHERE id = post_rec.id
        AND cardinality(COALESCE(mentioned_project_ids, '{}')) < 3
        AND NOT (COALESCE(mentioned_project_ids, '{}') @> ARRAY[inv.project_id]);
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_project_collab_invite(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_project_collab_invite(uuid, boolean) TO authenticated;
