-- "สรุปโดย SAMECOR" on Exhibition events: who it suits, what you take away, what to know
-- before going, and which SAMECOR work categories relate to it (for the "related works" row).
-- Written by the scout / team from the organiser's own page; editable in the admin editor.

ALTER TABLE anthem.events ADD COLUMN IF NOT EXISTS insights jsonb;

-- Keep only the known keys, strings only, trimmed and capped. Anything else is dropped.
CREATE OR REPLACE FUNCTION anthem.event_insights_clean(_in jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  WITH spec(key, max_items, max_len) AS (
    VALUES ('who_for', 5, 140), ('takeaways', 4, 140), ('know_before', 5, 140), ('related_categories', 4, 40)
  ),
  cleaned AS (
    SELECT s.key,
           (SELECT coalesce(jsonb_agg(v ORDER BY ord), '[]'::jsonb)
              FROM (SELECT left(btrim(x), s.max_len) AS v, ord
                      FROM jsonb_array_elements_text(
                             CASE WHEN jsonb_typeof(_in -> s.key) = 'array' THEN _in -> s.key ELSE '[]'::jsonb END
                           ) WITH ORDINALITY AS a(x, ord)
                     WHERE btrim(x) <> ''
                     ORDER BY ord
                     LIMIT s.max_items) t) AS items
      FROM spec s
  )
  SELECT CASE
           WHEN _in IS NULL OR jsonb_typeof(_in) <> 'object' THEN NULL
           WHEN (SELECT bool_and(jsonb_array_length(items) = 0) FROM cleaned) THEN NULL
           ELSE (SELECT jsonb_object_agg(key, items) FROM cleaned)
         END;
$$;

-- Team edit (admin editor). NULL or an empty object clears it.
CREATE OR REPLACE FUNCTION public.admin_event_set_insights(_id uuid, _insights jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  v jsonb := anthem.event_insights_clean(_insights);
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;
  UPDATE anthem.events SET insights = v, updated_at = now() WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'event_not_found' USING ERRCODE = 'P0002'; END IF;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_event_set_insights(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_event_set_insights(uuid, jsonb) TO authenticated;

-- Scout drafts may carry "insights" too (same shape); stored cleaned on the new draft.
CREATE OR REPLACE FUNCTION public.scout_event_draft(_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
DECLARE
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

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  IF EXISTS (
    SELECT 1 FROM public.admin_event_similar(v_title, nullif(_data ->> 'starts_on', '')::date, v_source_url) s
    WHERE s.score >= 0.6
  ) THEN
    RETURN NULL;
  END IF;

  v_id := public.admin_event_save(
    NULL,
    (_data - 'cover_url' - 'insights') || jsonb_build_object('origin', 'curated', 'gallery_urls', '[]'::jsonb,
                                                'sponsors', coalesce(_data -> 'sponsors', '[]'::jsonb),
                                                'project_ids', '[]'::jsonb),
    false
  );
  UPDATE anthem.events SET insights = anthem.event_insights_clean(_data -> 'insights') WHERE id = v_id;

  INSERT INTO shared.admin_audit_log (actor_id, action, target_type, target_id, metadata)
  VALUES (v_owner, 'event_draft_scout', 'event', v_id::text,
          jsonb_build_object('source_url', v_source_url, 'batch', _data ->> 'scout_batch'));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.scout_event_draft(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scout_event_draft(jsonb) TO event_scout;

-- Rollback:
-- ALTER TABLE anthem.events DROP COLUMN IF EXISTS insights;
-- DROP FUNCTION IF EXISTS public.admin_event_set_insights(uuid, jsonb);
-- DROP FUNCTION IF EXISTS anthem.event_insights_clean(jsonb);
-- (scout_event_draft: re-run 20261104120000_event_scout_session_user.sql)
