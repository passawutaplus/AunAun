-- Event scout: a weekly cloud routine proposes Exhibition events as DRAFTS.
-- It connects as a dedicated role that can do exactly one thing — call scout_event_draft() —
-- which goes through the same admin_event_save validation the team editor uses. Nothing it
-- creates is visible to the public until an admin publishes it in /admin/events.
--
-- Owner steps after applying this file (once):
--   1. ALTER ROLE event_scout PASSWORD '<long random password>';   -- keep it out of git
--   2. GitHub → Settings → Secrets → Actions → EVENT_SCOUT_DB_URL =
--      postgresql://event_scout:<password>@<session-pooler host>:5432/postgres?sslmode=require
--      (Supabase → Connect → Session pooler; the direct host is IPv6-only and fails from GitHub)
--   3. The workflow .github/workflows/event-drafts-apply.yml then applies each merged
--      Solo-Code/supabase/event-drafts/*.sql file.

-- ── Role ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'event_scout') THEN
    CREATE ROLE event_scout LOGIN NOINHERIT NOCREATEDB NOCREATEROLE;
  END IF;
END $$;
GRANT CONNECT ON DATABASE postgres TO event_scout;
GRANT USAGE ON SCHEMA public TO event_scout;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM event_scout;
REVOKE ALL ON ALL TABLES IN SCHEMA anthem FROM event_scout;

-- ── Draft proposal ───────────────────────────────────────────────────────────
-- Returns the new draft id, or NULL when the event already exists (same source link, or a
-- title that admin_event_similar scores >= 0.6 — the team sees near-duplicates in the editor).
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
  IF current_user <> 'event_scout' AND NOT public.has_role(auth.uid(), 'admin') THEN
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
    _data || jsonb_build_object('origin', 'curated', 'gallery_urls', '[]'::jsonb, 'cover_url', '',
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

-- Rollback:
-- DROP FUNCTION IF EXISTS public.scout_event_draft(jsonb);
-- REVOKE CONNECT ON DATABASE postgres FROM event_scout; DROP ROLE IF EXISTS event_scout;
