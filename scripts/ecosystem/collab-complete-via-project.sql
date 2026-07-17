-- A collab is completed only by publishing a shared project.
-- Apply after hire-collab-outcome-status.sql + project-community-links.sql.

ALTER TABLE anthem.collab_requests
  ADD COLUMN IF NOT EXISTS completed_project_id uuid;

CREATE INDEX IF NOT EXISTS idx_collab_requests_completed_project
  ON anthem.collab_requests (completed_project_id)
  WHERE completed_project_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.complete_collab_with_project(
  _request_id uuid,
  _project_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = anthem, public, shared
AS $$
DECLARE
  req anthem.collab_requests%ROWTYPE;
  project_rec anthem.projects%ROWTYPE;
  partner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT * INTO req
  FROM anthem.collab_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND OR auth.uid() NOT IN (req.sender_id, req.recipient_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF req.status <> 'accepted' AND req.status <> 'completed' THEN
    RAISE EXCEPTION 'COLLAB_NOT_ACCEPTED';
  END IF;

  SELECT * INTO project_rec
  FROM anthem.projects
  WHERE id = _project_id
    AND owner_id = auth.uid()
    AND status = 'Published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROJECT_MUST_BE_PUBLISHED';
  END IF;

  partner_id := CASE
    WHEN auth.uid() = req.sender_id THEN req.recipient_id
    ELSE req.sender_id
  END;

  UPDATE anthem.projects
  SET collab_user_ids = (
    SELECT array_agg(DISTINCT user_id)
    FROM unnest(COALESCE(collab_user_ids, '{}') || ARRAY[partner_id]) AS user_id
  )
  WHERE id = _project_id;

  INSERT INTO anthem.project_collab_invites (
    project_id,
    invited_user_id,
    invited_by,
    status,
    responded_at
  )
  VALUES (
    _project_id,
    partner_id,
    auth.uid(),
    'accepted',
    now()
  )
  ON CONFLICT (project_id, invited_user_id)
  DO UPDATE SET
    status = 'accepted',
    responded_at = now();

  UPDATE anthem.collab_requests
  SET status = 'completed',
      completed_project_id = _project_id,
      updated_at = now()
  WHERE id = _request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_collab_with_project(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_collab_with_project(uuid, uuid) TO authenticated;

