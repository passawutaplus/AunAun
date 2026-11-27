-- Event scout, follow-up to 20261127230000.
--
-- 1) scout_event_publish fixed: it was written from the first version of scout_event_draft and so
--    (a) checked current_user, which inside a SECURITY DEFINER function is the function owner — the
--        event_scout role was refused (same bug as 20261104120000 fixed for drafts), and
--    (b) dropped "insights". Both now work as in scout_event_draft.
-- 2) Posters without any new password or key: the apply workflow (role event_scout, the secret it
--    already has) asks for a short-lived ticket; the edge function scout-cover spends one use of it
--    per stored picture. The ticket itself is never stored, only its hash.
--    This replaces the upload-account idea (20261127231000, removed before it was ever applied).
--
-- Undo: DROP FUNCTION public.scout_cover_spend(text); DROP FUNCTION public.scout_cover_ticket();
--       DROP TABLE anthem.scout_cover_tickets;  (and re-run 20261127230000 for the old publish function)

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
  IF session_user <> 'event_scout' AND NOT public.has_role(auth.uid(), 'admin') THEN
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
  v_data := (_data - 'cover_url' - 'cover_width' - 'cover_height' - 'insights')
            || jsonb_build_object('origin', 'curated', 'gallery_urls', '[]'::jsonb,
                                  'sponsors', coalesce(_data -> 'sponsors', '[]'::jsonb),
                                  'project_ids', '[]'::jsonb);
  IF v_cover IS NOT NULL THEN
    v_data := v_data || jsonb_build_object('cover_url', v_cover);
  END IF;

  v_id := public.admin_event_save(NULL, v_data, true);

  UPDATE anthem.events SET insights = anthem.event_insights_clean(_data -> 'insights') WHERE id = v_id;
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

-- ── Poster tickets ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anthem.scout_cover_tickets (
  token_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  uses_left integer NOT NULL CHECK (uses_left >= 0)
);
ALTER TABLE anthem.scout_cover_tickets ENABLE ROW LEVEL SECURITY; -- no policy: definer functions only
REVOKE ALL ON anthem.scout_cover_tickets FROM PUBLIC, anon, authenticated;

-- The apply workflow asks for one ticket per run: 20 minutes, 40 pictures.
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
  VALUES (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '20 minutes', 40);
  RETURN v_token;
END;
$$;
REVOKE ALL ON FUNCTION public.scout_cover_ticket() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scout_cover_ticket() TO event_scout;

-- The scout-cover edge function spends one use per picture; false = unknown, expired or used up.
CREATE OR REPLACE FUNCTION public.scout_cover_spend(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  UPDATE anthem.scout_cover_tickets
     SET uses_left = uses_left - 1
   WHERE token_hash = encode(sha256(convert_to(coalesce(_token, ''), 'UTF8')), 'hex')
     AND expires_at > now()
     AND uses_left > 0;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.scout_cover_spend(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scout_cover_spend(text) TO service_role;
