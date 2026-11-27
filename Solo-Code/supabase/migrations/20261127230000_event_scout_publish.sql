-- Event scout: publish straight away (owner decision 2026-11-27 — no approval step; the owner
-- reports anything wrong and it is edited or removed afterwards).
--
-- scout_event_publish(jsonb) takes the same object as scout_event_draft, plus optionally
--   cover_url / cover_width / cover_height  — set by the apply workflow after it stored the
--   organiser's official poster in our own storage (event_save still rejects any other URL).
-- An event without a start date or a place is not ready for the public: it stays a draft.
-- Returns the event id, or NULL when the event already exists (same rule as the draft function).
-- Undo: DROP FUNCTION public.scout_event_publish(jsonb);  (scout_event_draft is unchanged)

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
  v_data jsonb;
  v_id uuid;
BEGIN
  IF current_user <> 'event_scout' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;
  IF v_source_url IS NULL OR v_title = '' THEN
    RAISE EXCEPTION 'scout events need a title and a source_url';
  END IF;

  -- Not enough to show the public: keep it as a draft for the team.
  IF nullif(_data ->> 'starts_on', '') IS NULL OR btrim(coalesce(_data ->> 'location_name', '')) = '' THEN
    RETURN public.scout_event_draft(_data - 'cover_url' - 'cover_width' - 'cover_height');
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  IF EXISTS (
    SELECT 1 FROM public.admin_event_similar(v_title, nullif(_data ->> 'starts_on', '')::date, v_source_url) s
    WHERE s.score >= 0.6
  ) THEN
    RETURN NULL;
  END IF;

  -- No cover_url key unless we have one: event_save treats any value (even "") as an upload to validate.
  v_data := (_data - 'cover_url' - 'cover_width' - 'cover_height')
            || jsonb_build_object('origin', 'curated', 'gallery_urls', '[]'::jsonb,
                                  'sponsors', coalesce(_data -> 'sponsors', '[]'::jsonb),
                                  'project_ids', '[]'::jsonb);
  IF v_cover IS NOT NULL THEN
    v_data := v_data || jsonb_build_object('cover_url', v_cover);
  END IF;

  v_id := public.admin_event_save(NULL, v_data, true);

  -- Picture size, so the new design can reserve the frame without cropping.
  IF v_cover IS NOT NULL AND v_w BETWEEN 1 AND 32767 AND v_h BETWEEN 1 AND 32767 THEN
    UPDATE anthem.events SET cover_width = v_w, cover_height = v_h WHERE id = v_id;
  END IF;

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (v_owner, 'event_publish_scout', 'event', v_id::text,
          jsonb_build_object('source_url', v_source_url, 'batch', _data ->> 'scout_batch', 'cover', v_cover IS NOT NULL));
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.scout_event_publish(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scout_event_publish(jsonb) TO event_scout;
