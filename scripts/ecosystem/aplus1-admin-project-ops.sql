-- Admin project / comment / collection ops (Aplus1)
-- Frontend: Anthem-Code/src/hooks/admin/useAdminMutations.ts
-- Also restores is_admin_user + log_admin_audit (referenced by KYC admin RPCs).

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false);
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

CREATE OR REPLACE FUNCTION public.log_admin_audit(
  _action text,
  _target_type text,
  _target_id text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shared', 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    _action,
    _target_type,
    _target_id,
    coalesce(_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_audit(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_admin_audit(text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_project_status(_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'anthem'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;

  IF _status IS NULL OR _status NOT IN ('Published', 'Draft', 'Private') THEN
    RAISE EXCEPTION 'INVALID: status';
  END IF;

  UPDATE anthem.projects
     SET status = _status,
         updated_at = now()
   WHERE id = _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบผลงาน';
  END IF;

  PERFORM public.log_admin_audit(
    'project.set_status',
    'project',
    _id::text,
    jsonb_build_object('status', _status)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_project_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_project_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_project(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'anthem', 'shared'
AS $$
DECLARE
  _title text;
  _exists boolean;
  _id_text text := _id::text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;

  SELECT title, true INTO _title, _exists FROM anthem.projects WHERE id = _id;
  IF NOT COALESCE(_exists, false) THEN
    RAISE EXCEPTION 'ไม่พบผลงาน';
  END IF;

  -- Engagement rows (no FK to projects — clean explicitly)
  DELETE FROM anthem.project_comments WHERE project_id = _id;
  DELETE FROM anthem.project_likes WHERE project_id = _id;
  DELETE FROM anthem.project_views WHERE project_id = _id;
  DELETE FROM anthem.project_bookmarks WHERE project_id = _id;
  DELETE FROM anthem.image_likes WHERE project_id = _id;
  DELETE FROM anthem.image_shares WHERE project_id = _id;
  DELETE FROM anthem.inspire_items WHERE project_id = _id;
  DELETE FROM anthem.project_collab_invites WHERE project_id = _id;

  -- hiring/collab project_id is text (legacy), not uuid
  UPDATE anthem.hiring_requests SET project_id = NULL WHERE project_id = _id_text;
  UPDATE anthem.collab_requests SET project_id = NULL WHERE project_id = _id_text;
  UPDATE anthem.app_feedback SET project_id = NULL WHERE project_id = _id;
  UPDATE anthem.work_reviews SET project_id = NULL WHERE project_id = _id;
  UPDATE shared.conversations SET project_id = NULL WHERE project_id = _id;
  UPDATE shared.messages SET project_id = NULL WHERE project_id = _id;
  UPDATE shared.gift_transactions SET project_id = NULL WHERE project_id = _id;
  UPDATE public.notifications SET project_id = NULL WHERE project_id = _id;

  -- collection_items / project_series_items cascade via FK
  DELETE FROM anthem.projects WHERE id = _id;

  PERFORM public.log_admin_audit(
    'project.delete',
    'project',
    _id_text,
    jsonb_build_object('title', coalesce(_title, ''))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_project(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_project(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_comment(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'anthem'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;

  -- Remove replies first (parent_id self-ref)
  DELETE FROM anthem.project_comments WHERE parent_id = _id;
  DELETE FROM anthem.project_comments WHERE id = _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบคอมเมนต์';
  END IF;

  PERFORM public.log_admin_audit('comment.delete', 'project_comment', _id::text, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_comment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_comment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_collection(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'anthem'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;

  DELETE FROM anthem.collection_items WHERE collection_id = _id;
  DELETE FROM anthem.collections WHERE id = _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบคอลเลกชัน';
  END IF;

  PERFORM public.log_admin_audit('collection.delete', 'collection', _id::text, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_collection(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_collection(uuid) TO authenticated;
