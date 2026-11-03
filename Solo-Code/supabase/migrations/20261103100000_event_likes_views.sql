-- Exhibition events: likes + view count.
-- Counters live on anthem.events (read with the row); writes only through the definer RPCs below,
-- since clients have SELECT-only access to anthem.events.

ALTER TABLE anthem.events
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS anthem.event_likes (
  event_id uuid NOT NULL REFERENCES anthem.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_likes_user_idx ON anthem.event_likes (user_id);

ALTER TABLE anthem.event_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON anthem.event_likes FROM anon, authenticated;
GRANT SELECT ON anthem.event_likes TO authenticated;

-- A user sees only their own likes (enough for the heart state); totals come from events.like_count.
DROP POLICY IF EXISTS event_likes_own_read ON anthem.event_likes;
CREATE POLICY event_likes_own_read ON anthem.event_likes
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- Toggle the caller's like on a published event; returns the new state and total.
CREATE OR REPLACE FUNCTION public.toggle_event_like(_event_id uuid)
RETURNS TABLE (liked boolean, like_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _liked boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM anthem.events e WHERE e.id = _event_id AND e.status = 'published') THEN
    RAISE EXCEPTION 'event_not_found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM anthem.event_likes l WHERE l.event_id = _event_id AND l.user_id = _uid;
  IF FOUND THEN
    _liked := false;
    UPDATE anthem.events e SET like_count = GREATEST(0, e.like_count - 1) WHERE e.id = _event_id;
  ELSE
    INSERT INTO anthem.event_likes (event_id, user_id) VALUES (_event_id, _uid);
    _liked := true;
    UPDATE anthem.events e SET like_count = e.like_count + 1 WHERE e.id = _event_id;
  END IF;

  RETURN QUERY SELECT _liked, e.like_count FROM anthem.events e WHERE e.id = _event_id;
END;
$$;

-- +1 view on a published event (the client calls it once per browser session per event).
CREATE OR REPLACE FUNCTION public.increment_event_view(_event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'anthem', 'public'
AS $$
  UPDATE anthem.events SET view_count = view_count + 1
  WHERE id = _event_id AND status = 'published';
$$;

-- Supabase grants anon EXECUTE on new public functions by default; likes are signed-in only.
REVOKE ALL ON FUNCTION public.toggle_event_like(uuid), public.increment_event_view(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_event_like(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_event_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_event_view(uuid) TO anon, authenticated;

-- "Registered": the signed-in user pressed the event's register / ticket button. Registration itself
-- happens on the organiser's site, so this is the closest the app can know; it powers Portfolio → Exhibition.
CREATE TABLE IF NOT EXISTS anthem.event_registrations (
  event_id uuid NOT NULL REFERENCES anthem.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_registrations_user_idx ON anthem.event_registrations (user_id, created_at DESC);

ALTER TABLE anthem.event_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON anthem.event_registrations FROM anon, authenticated;
GRANT SELECT ON anthem.event_registrations TO authenticated;

DROP POLICY IF EXISTS event_registrations_own_read ON anthem.event_registrations;
CREATE POLICY event_registrations_own_read ON anthem.event_registrations
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.record_event_registration(_event_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'anthem', 'public'
AS $$
  INSERT INTO anthem.event_registrations (event_id, user_id)
  SELECT e.id, auth.uid() FROM anthem.events e
  WHERE e.id = _event_id AND e.status = 'published' AND auth.uid() IS NOT NULL
  ON CONFLICT (event_id, user_id) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.record_event_registration(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_event_registration(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_event_registration(uuid) TO authenticated;

-- Rollback:
-- DROP FUNCTION IF EXISTS public.record_event_registration(uuid);
-- DROP TABLE IF EXISTS anthem.event_registrations;
-- DROP FUNCTION IF EXISTS public.toggle_event_like(uuid);
-- DROP FUNCTION IF EXISTS public.increment_event_view(uuid);
-- DROP TABLE IF EXISTS anthem.event_likes;
-- ALTER TABLE anthem.events DROP COLUMN IF EXISTS view_count, DROP COLUMN IF EXISTS like_count;
