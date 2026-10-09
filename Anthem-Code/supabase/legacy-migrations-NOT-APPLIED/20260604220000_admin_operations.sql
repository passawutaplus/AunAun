-- Admin operations: moderated CRUD + audit log (requires has_role admin)

CREATE OR REPLACE FUNCTION public._admin_actor()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH: ต้องเข้าสู่ระบบ';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'FORBIDDEN: ต้องเป็น admin';
  END IF;
  RETURN auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public._admin_audit(_action text, _target_type text, _target_id uuid, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), _action, _target_type, _target_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

-- Project: change status or remove
CREATE OR REPLACE FUNCTION public.admin_set_project_status(_id uuid, _status text)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE p public.projects;
BEGIN
  PERFORM public._admin_actor();
  IF _status NOT IN ('Published', 'Draft', 'Private') THEN
    RAISE EXCEPTION 'INVALID: สถานะไม่ถูกต้อง';
  END IF;
  UPDATE public.projects SET status = _status, updated_at = now() WHERE id = _id RETURNING * INTO p;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: ไม่พบผลงาน'; END IF;
  PERFORM public._admin_audit('project.set_status', 'project', _id, jsonb_build_object('status', _status));
  RETURN p;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_project(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_actor();
  DELETE FROM public.project_likes WHERE project_id = _id;
  DELETE FROM public.project_bookmarks WHERE project_id = _id;
  DELETE FROM public.project_comments WHERE project_id = _id;
  DELETE FROM public.project_views WHERE project_id = _id;
  DELETE FROM public.collection_items WHERE project_id = _id;
  DELETE FROM public.image_likes WHERE project_id = _id;
  DELETE FROM public.image_shares WHERE project_id = _id;
  DELETE FROM public.gift_transactions WHERE project_id = _id;
  DELETE FROM public.projects WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND: ไม่พบผลงาน'; END IF;
  PERFORM public._admin_audit('project.delete', 'project', _id, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_comment(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_actor();
  DELETE FROM public.project_comments WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public._admin_audit('comment.delete', 'project_comment', _id, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_collection(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_actor();
  DELETE FROM public.collection_items WHERE collection_id = _id;
  DELETE FROM public.collections WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public._admin_audit('collection.delete', 'collection', _id, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_job_status(_id uuid, _status text)
RETURNS public.job_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE j public.job_posts;
BEGIN
  PERFORM public._admin_actor();
  IF _status NOT IN ('open', 'closed', 'filled') THEN
    RAISE EXCEPTION 'INVALID: สถานะงานไม่ถูกต้อง';
  END IF;
  UPDATE public.job_posts SET status = _status::public.job_status, updated_at = now() WHERE id = _id RETURNING * INTO j;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public._admin_audit('job.set_status', 'job_post', _id, jsonb_build_object('status', _status));
  RETURN j;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(_user_id uuid, _role text, _grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_actor();
  IF _role NOT IN ('admin', 'user') THEN RAISE EXCEPTION 'INVALID role'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    PERFORM public._admin_audit('user.grant_role', 'user', _user_id, jsonb_build_object('role', _role));
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = _role::public.app_role;
    PERFORM public._admin_audit('user.revoke_role', 'user', _user_id, jsonb_build_object('role', _role));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_gift_limits(
  _daily_unverified int, _daily_verified int, _velocity int, _hold_hours int, _max_topup int
)
RETURNS public.gift_limits_config
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.gift_limits_config;
BEGIN
  PERFORM public._admin_actor();
  UPDATE public.gift_limits_config SET
    daily_limit_unverified = _daily_unverified,
    daily_limit_verified = _daily_verified,
    velocity_per_hour = _velocity,
    hold_hours = _hold_hours,
    max_topup_per_tx = _max_topup,
    updated_at = now()
  WHERE id = 1
  RETURNING * INTO c;
  PERFORM public._admin_audit('gift_limits.update', 'gift_limits_config', '00000000-0000-0000-0000-000000000001'::uuid, to_jsonb(c));
  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_gift(
  _id uuid, _active boolean, _price_px int DEFAULT NULL
)
RETURNS public.gifts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE g public.gifts;
BEGIN
  PERFORM public._admin_actor();
  UPDATE public.gifts SET
    active = COALESCE(_active, active),
    price_px = COALESCE(_price_px, price_px)
  WHERE id = _id
  RETURNING * INTO g;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public._admin_audit('gift.update', 'gift', _id, jsonb_build_object('active', g.active, 'price_px', g.price_px));
  RETURN g;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_cashout(_id uuid, _note text DEFAULT '')
RETURNS public.cashout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c public.cashout_requests;
BEGIN
  PERFORM public._admin_actor();
  SELECT * INTO c FROM public.cashout_requests WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF c.status <> 'pending' THEN RAISE EXCEPTION 'INVALID: เฉพาะคำขอ pending'; END IF;
  UPDATE public.wallets SET earned_px = earned_px + c.gross_px, updated_at = now() WHERE user_id = c.user_id;
  UPDATE public.cashout_requests SET status = 'rejected', processed_at = now() WHERE id = _id RETURNING * INTO c;
  PERFORM public._admin_audit('cashout.reject', 'cashout_request', _id, jsonb_build_object('note', _note, 'gross_px', c.gross_px));
  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_notifications(_limit int DEFAULT 100)
RETURNS SETOF public.notifications
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, shared
AS $$
  SELECT n.id, n.user_id, n.app, n.kind, n.title, n.body, n.link, n.metadata,
         n.is_read, n.is_dismissed, n.created_at
  FROM shared.notifications n
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY n.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500));
$$;

CREATE OR REPLACE FUNCTION public.admin_dismiss_notification(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._admin_actor();
  UPDATE shared.notifications SET is_dismissed = true WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public._admin_audit('notification.dismiss', 'notification', _id, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public._admin_actor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._admin_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_project_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_comment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_collection(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_job_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_gift_limits(int, int, int, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_gift(uuid, boolean, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_cashout(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_notifications(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dismiss_notification(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_project_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_project(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_comment(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_collection(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_job_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_gift_limits(int, int, int, int, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_gift(uuid, boolean, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_cashout(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_notifications(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_dismiss_notification(uuid) FROM PUBLIC, anon;
