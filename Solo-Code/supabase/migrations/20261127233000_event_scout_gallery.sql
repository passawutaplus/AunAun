-- Event scout: additional pictures (the slider on the event page), owner request 2026-11-27.
--
-- A batch may give "gallery_source_urls" (pictures from the organiser's own event page). The apply
-- workflow stores them like the cover and passes
--   gallery_urls  — up to 8 URLs in our storage (event_save still validates every one), and
--   media_sizes   — { "<url>": [width, height] } so the new design never crops them.
-- A ticket now covers 200 pictures per run (cover + up to 8 extra for a full batch).
--
-- Undo: re-run 20261127232000 (publish without gallery, 40 pictures per ticket).

CREATE OR REPLACE FUNCTION public.scout_event_publish(_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
  v_owner constant uuid := '82039b6d-cdf4-4c46-958a-d770d849382c';
  v_source_url text := nullif(btrim(coalesce(_data ->> 'source_url', '')), '');
  v_title text := btrim(coalesce(_data ->> 'title', ''));
  v_cover text := nullif(btrim(coalesce(_data ->> 'cover_url', '')), '');
  v_w int := CASE WHEN (_data ->> 'cover_width') ~ '^[0-9]{1,5}$' THEN (_data ->> 'cover_width')::int END;
  v_h int := CASE WHEN (_data ->> 'cover_height') ~ '^[0-9]{1,5}$' THEN (_data ->> 'cover_height')::int END;
  v_gallery jsonb := CASE WHEN jsonb_typeof(_data -> 'gallery_urls') = 'array' THEN _data -> 'gallery_urls' ELSE '[]'::jsonb END;
  v_sizes jsonb := CASE WHEN jsonb_typeof(_data -> 'media_sizes') = 'object' THEN _data -> 'media_sizes' ELSE '{}'::jsonb END;
  v_plain jsonb := _data - 'cover_url' - 'cover_width' - 'cover_height' - 'gallery_urls' - 'media_sizes';
  v_data jsonb;
  v_id uuid;
BEGIN
  IF session_user <> 'event_scout' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;
  IF v_source_url IS NULL OR v_title = '' THEN
    RAISE EXCEPTION 'scout events need a title and a source_url';
  END IF;

  -- Not enough to show the public: keep it as a draft for the team (drafts carry no pictures).
  IF nullif(_data ->> 'starts_on', '') IS NULL OR btrim(coalesce(_data ->> 'location_name', '')) = '' THEN
    RETURN public.scout_event_draft(v_plain);
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  IF EXISTS (
    SELECT 1 FROM public.admin_event_similar(v_title, nullif(_data ->> 'starts_on', '')::date, v_source_url) s
    WHERE s.score >= 0.6
  ) THEN
    RETURN NULL;
  END IF;

  -- No cover_url key unless we have one: event_save treats any value (even "") as an upload to validate.
  v_data := (v_plain - 'insights')
            || jsonb_build_object('origin', 'curated', 'gallery_urls', v_gallery,
                                  'sponsors', coalesce(_data -> 'sponsors', '[]'::jsonb),
                                  'project_ids', '[]'::jsonb);
  IF v_cover IS NOT NULL THEN
    v_data := v_data || jsonb_build_object('cover_url', v_cover);
  END IF;

  v_id := public.admin_event_save(NULL, v_data, true);

  UPDATE anthem.events
     SET insights = anthem.event_insights_clean(_data -> 'insights'),
         media_sizes = v_sizes
   WHERE id = v_id;
  -- Picture size, so the new design can reserve the frame without cropping.
  IF v_cover IS NOT NULL AND v_w BETWEEN 1 AND 32767 AND v_h BETWEEN 1 AND 32767 THEN
    UPDATE anthem.events SET cover_width = v_w, cover_height = v_h WHERE id = v_id;
  END IF;

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (v_owner, 'event_publish_scout', 'event', v_id::text,
          jsonb_build_object('source_url', v_source_url, 'batch', _data ->> 'scout_batch',
                             'cover', v_cover IS NOT NULL, 'gallery', jsonb_array_length(v_gallery)));
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.scout_event_publish(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scout_event_publish(jsonb) TO event_scout;

CREATE OR REPLACE FUNCTION public.scout_cover_ticket()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
BEGIN
  IF session_user <> 'event_scout' THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;
  DELETE FROM anthem.scout_cover_tickets WHERE expires_at < now();
  INSERT INTO anthem.scout_cover_tickets (token_hash, expires_at, uses_left)
  VALUES (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '20 minutes', 200);
  RETURN v_token;
END;
$$;
REVOKE ALL ON FUNCTION public.scout_cover_ticket() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scout_cover_ticket() TO event_scout;
