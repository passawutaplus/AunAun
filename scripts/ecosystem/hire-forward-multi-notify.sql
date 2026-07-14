-- Multi-forward hire + private friend note notification
ALTER TABLE anthem.hiring_requests
  ADD COLUMN IF NOT EXISTS forward_note text;

COMMENT ON COLUMN anthem.hiring_requests.forward_note IS
  'Private note from original freelancer to forwarded friend (not shown to client)';

CREATE OR REPLACE FUNCTION public.notify_hire_forwarded(
  p_to_user_id uuid,
  p_new_request_id uuid,
  p_note text DEFAULT NULL,
  p_project_title text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO shared, anthem, public
AS $$
DECLARE
  v_from uuid := auth.uid();
  v_from_name text;
  v_title text;
  v_body text;
  v_id uuid;
BEGIN
  IF v_from IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM anthem.hiring_requests child
    JOIN anthem.hiring_requests parent
      ON parent.id = child.forwarded_from_request_id
    WHERE child.id = p_new_request_id
      AND child.freelancer_id = p_to_user_id
      AND parent.freelancer_id = v_from
  ) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT coalesce(nullif(btrim(display_name), ''), nullif(btrim(username), ''), 'ครีเอเตอร์')
  INTO v_from_name
  FROM public.profiles
  WHERE user_id = v_from
  LIMIT 1;

  v_from_name := coalesce(v_from_name, 'ครีเอเตอร์');
  v_title := 'มีเพื่อนส่งต่องานมาให้คุณ';

  IF nullif(btrim(coalesce(p_note, '')), '') IS NOT NULL THEN
    v_body := v_from_name || ' ส่งต่องานมาให้คุณ: ' || btrim(p_note);
  ELSIF nullif(btrim(coalesce(p_project_title, '')), '') IS NOT NULL THEN
    v_body := v_from_name || ' ส่งต่องาน «' || btrim(p_project_title) || '» มาให้คุณ';
  ELSE
    v_body := v_from_name || ' ส่งต่องานมาให้คุณ — เปิดดูที่คำขอจ้างงาน';
  END IF;

  INSERT INTO shared.notifications (
    user_id, app, kind, title, body, link, metadata, is_read, is_dismissed
  ) VALUES (
    p_to_user_id,
    'anthem',
    'hire_forward',
    v_title,
    v_body,
    '/portfolio?focus=hiring',
    jsonb_build_object(
      'request_id', p_new_request_id,
      'from_user_id', v_from
    ),
    false,
    false
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_hire_forwarded(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_hire_forwarded(uuid, uuid, text, text) TO authenticated, service_role;
