-- Follow-up to 20261007100000_revoke_server_only_rpcs.sql (see Solo-Code/docs/SOLO-HANDOFF.md §3.1, §3.3).
--
-- 1. notify_collab_end_event / notify_hire_cancel_event: browser-callable, so verify the caller.
--    When auth.uid() IS NULL the call comes from service_role / cron / another SECURITY DEFINER
--    function with no end-user JWT (e.g. finalize_expired_*), which stays allowed.
--    When auth.uid() is set, the caller must be a party to the referenced request and the
--    recipient must be a party too; otherwise the call is a silent no-op (RETURN NULL).
-- 2. recommend_from_likes: only returns the caller's own likes.
-- 3. assert_connect_payouts_ready: only called from other SECURITY DEFINER functions -> service_role only.
-- 4. Pin search_path on the 5 functions flagged by the security advisor.
--
-- public.profiles_public is intentionally left as a security-barrier definer view: it is the
-- column-filtered public projection of profiles (hides private columns).

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_collab_end_event(
  p_to_user_id uuid, p_title text, p_body text, p_link text, p_end_id uuid, p_collab_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shared', 'public'
AS $function$
DECLARE
  v_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  IF p_to_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_caller IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM shared.collab_end_requests r
      JOIN shared.conversations c ON c.id = r.conversation_id
      WHERE r.id = p_end_id
        AND r.collab_request_id IS NOT DISTINCT FROM p_collab_id
        AND v_caller IN (c.client_id, c.freelancer_id)
        AND p_to_user_id IN (c.client_id, c.freelancer_id)
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO shared.notifications (
    user_id, app, kind, title, body, link, metadata, is_read, is_dismissed
  ) VALUES (
    p_to_user_id,
    'anthem',
    'collab_end',
    coalesce(p_title, 'ขอยุติคอลแลป'),
    coalesce(p_body, ''),
    coalesce(nullif(p_link, ''), '/chat'),
    jsonb_build_object(
      'end_request_id', p_end_id,
      'collab_request_id', p_collab_id
    ),
    false,
    false
  )
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_column THEN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_hire_cancel_event(
  p_to_user_id uuid, p_title text, p_body text, p_link text, p_cancel_id uuid, p_hire_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'shared', 'anthem', 'public'
AS $function$
DECLARE
  v_id uuid;
  v_caller uuid := auth.uid();
BEGIN
  IF p_to_user_id IS NULL THEN RETURN NULL; END IF;

  IF v_caller IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM anthem.hire_cancel_requests r
      JOIN anthem.hiring_requests h ON h.id = r.hiring_request_id
      WHERE r.id = p_cancel_id
        AND r.hiring_request_id = p_hire_id
        AND v_caller IN (h.client_id, h.freelancer_id)
        AND p_to_user_id IN (h.client_id, h.freelancer_id)
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO shared.notifications (
    user_id, app, kind, title, body, link, metadata, is_read, is_dismissed
  ) VALUES (
    p_to_user_id, 'anthem', 'hire_cancel',
    coalesce(p_title, 'คำขอยกเลิกงาน'), coalesce(p_body, ''),
    coalesce(nullif(p_link, ''), '/chat'),
    jsonb_build_object('cancel_request_id', p_cancel_id, 'hiring_request_id', p_hire_id),
    false, false
  ) RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.recommend_from_likes(_user_id uuid, _limit integer DEFAULT 24)
RETURNS TABLE(id text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'anthem', 'public'
AS $function$
  SELECT p.id::text
  FROM anthem.project_likes pl
  JOIN anthem.projects p ON p.id = pl.project_id
  WHERE pl.user_id = _user_id
    AND (auth.uid() IS NULL OR auth.uid() = _user_id)
    AND p.status = 'Published'
  ORDER BY pl.created_at DESC
  LIMIT GREATEST(1, LEAST(coalesce(_limit, 24), 50));
$function$;

REVOKE EXECUTE ON FUNCTION public.recommend_from_likes(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recommend_from_likes(uuid, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.assert_connect_payouts_ready(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_connect_payouts_ready(uuid) TO service_role;

ALTER FUNCTION public.creator_submissions_rate_guard() SET search_path = public, pg_temp;
ALTER FUNCTION public.job_application_reason_copy(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION anthem.hiring_org_guard_status() SET search_path = anthem, public, pg_temp;
ALTER FUNCTION anthem.set_creator_objects_updated_at() SET search_path = anthem, public, pg_temp;
ALTER FUNCTION anthem.set_creator_services_updated_at() SET search_path = anthem, public, pg_temp;

COMMIT;
