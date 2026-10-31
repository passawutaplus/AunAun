-- log_product_event rejected every event the client added after July ("invalid event" 400):
-- page_dwell + the free-launch funnel (connect_message, proposal_send, proposal_accept,
-- workspace_open, task_create). Same function, wider allow-list.
CREATE OR REPLACE FUNCTION public.log_product_event(_event_name text, _session_id text, _path text DEFAULT NULL::text, _referrer text DEFAULT NULL::text, _props jsonb DEFAULT '{}'::jsonb, _app text DEFAULT 'aplus1'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_name text := lower(trim(COALESCE(_event_name, '')));
  v_session text := trim(COALESCE(_session_id, ''));
  v_props jsonb := COALESCE(_props, '{}'::jsonb);
  v_allowed text[] := ARRAY[
    'page_view','page_dwell','project_view','profile_view','feed_search',
    'hire_open','hire_submit','collab_open','collab_submit',
    'job_apply','follow_click','share_click','cta_ecosystem',
    'collection_save','inspire_click','ad_click','ad_impression',
    'connect_message','proposal_send','proposal_accept','workspace_open','task_create'
  ];
BEGIN
  IF v_session IS NULL OR char_length(v_session) < 8 OR char_length(v_session) > 128 THEN
    RAISE EXCEPTION 'invalid session';
  END IF;
  IF v_name IS NULL OR NOT (v_name = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'invalid event';
  END IF;
  IF jsonb_typeof(v_props) <> 'object' THEN
    RAISE EXCEPTION 'invalid props';
  END IF;
  IF octet_length(v_props::text) > 4000 THEN
    RAISE EXCEPTION 'props too large';
  END IF;

  -- Soft rate limit: max 120 rows / session / minute
  IF (
    SELECT COUNT(*) FROM public.product_events pe
    WHERE pe.session_id = v_session AND pe.created_at > now() - interval '1 minute'
  ) >= 120 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.product_events (app, event_name, user_id, session_id, path, referrer, props)
  VALUES (
    COALESCE(NULLIF(trim(_app), ''), 'aplus1'),
    v_name,
    auth.uid(),
    v_session,
    NULLIF(left(COALESCE(_path, ''), 500), ''),
    NULLIF(left(COALESCE(_referrer, ''), 500), ''),
    v_props
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;
