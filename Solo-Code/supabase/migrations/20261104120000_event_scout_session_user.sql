-- scout_event_draft: inside a SECURITY DEFINER function current_user is the function owner,
-- so the event_scout check never matched. session_user is the login role that called it.
CREATE OR REPLACE FUNCTION public.scout_event_draft(_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  -- Drafts are owned by the SAMECOR team account (the owner's admin user), like team-entered events.
  v_owner constant uuid := '82039b6d-cdf4-4c46-958a-d770d849382c';
  v_source_url text := nullif(btrim(coalesce(_data ->> 'source_url', '')), '');
  v_title text := btrim(coalesce(_data ->> 'title', ''));
  v_id uuid;
BEGIN
  IF session_user <> 'event_scout' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;
  IF v_source_url IS NULL OR v_title = '' THEN
    RAISE EXCEPTION 'scout drafts need a title and a source_url';
  END IF;

  -- admin_event_save authorises through auth.uid(); act as the team account for this call only.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  IF EXISTS (
    SELECT 1 FROM public.admin_event_similar(v_title, nullif(_data ->> 'starts_on', '')::date, v_source_url) s
    WHERE s.score >= 0.6
  ) THEN
    RETURN NULL;
  END IF;

  v_id := public.admin_event_save(
    NULL,
    -- No cover_url key at all: event_save treats any value (even "") as an upload to validate.
    (_data - 'cover_url') || jsonb_build_object('origin', 'curated', 'gallery_urls', '[]'::jsonb,
                                                'sponsors', coalesce(_data -> 'sponsors', '[]'::jsonb),
                                                'project_ids', '[]'::jsonb),
    false  -- never publish
  );

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (v_owner, 'event_draft_scout', 'event', v_id::text,
          jsonb_build_object('source_url', v_source_url, 'batch', _data ->> 'scout_batch'));
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.scout_event_draft(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scout_event_draft(jsonb) TO event_scout;
