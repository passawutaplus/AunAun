-- "สนใจ" (interested) on Exhibition events: a like-style toggle that also opts the user in to
-- reminders 3 days and 1 day before the event starts (in-app notification, same table and
-- dispatch as the other SAMECOR notifications). Lists in Portfolio → Exhibition → สนใจ.

ALTER TABLE anthem.events
  ADD COLUMN IF NOT EXISTS interest_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS anthem.event_interests (
  event_id uuid NOT NULL REFERENCES anthem.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  reminded_3d boolean NOT NULL DEFAULT false,
  reminded_1d boolean NOT NULL DEFAULT false,
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS event_interests_user_idx ON anthem.event_interests (user_id, created_at DESC);

ALTER TABLE anthem.event_interests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON anthem.event_interests FROM anon, authenticated;
GRANT SELECT ON anthem.event_interests TO authenticated;

DROP POLICY IF EXISTS event_interests_own_read ON anthem.event_interests;
CREATE POLICY event_interests_own_read ON anthem.event_interests
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- Toggle the caller's interest on a published event; returns the new state and total.
CREATE OR REPLACE FUNCTION public.toggle_event_interest(_event_id uuid)
RETURNS TABLE (interested boolean, interest_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _on boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM anthem.events e WHERE e.id = _event_id AND e.status = 'published') THEN
    RAISE EXCEPTION 'event_not_found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM anthem.event_interests i WHERE i.event_id = _event_id AND i.user_id = _uid;
  IF FOUND THEN
    _on := false;
    UPDATE anthem.events e SET interest_count = GREATEST(0, e.interest_count - 1) WHERE e.id = _event_id;
  ELSE
    INSERT INTO anthem.event_interests (event_id, user_id) VALUES (_event_id, _uid);
    _on := true;
    UPDATE anthem.events e SET interest_count = e.interest_count + 1 WHERE e.id = _event_id;
  END IF;

  RETURN QUERY SELECT _on, e.interest_count FROM anthem.events e WHERE e.id = _event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_event_interest(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_event_interest(uuid) TO authenticated;

-- Reminders: once a day, notify interested users whose event starts in 3 days or tomorrow
-- (Bangkok dates). Each reminder is sent once; an event that moved its date still reminds.
CREATE OR REPLACE FUNCTION anthem.queue_event_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'shared', 'public'
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  sent integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT i.event_id, i.user_id, e.title, e.starts_on, e.location_name,
           (e.starts_on = today + 1) AS is_tomorrow
    FROM anthem.event_interests i
    JOIN anthem.events e ON e.id = i.event_id
    WHERE e.status = 'published'
      AND ((e.starts_on = today + 3 AND NOT i.reminded_3d) OR (e.starts_on = today + 1 AND NOT i.reminded_1d))
  LOOP
    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    VALUES (
      r.user_id, 'anthem', 'event_reminder',
      CASE WHEN r.is_tomorrow THEN 'งานที่คุณสนใจเริ่มพรุ่งนี้' ELSE 'งานที่คุณสนใจเริ่มในอีก 3 วัน' END,
      r.title || coalesce(' · ' || r.location_name, ''),
      '/exhibition/' || r.event_id,
      jsonb_build_object('event_id', r.event_id, 'starts_on', r.starts_on, 'days_before', CASE WHEN r.is_tomorrow THEN 1 ELSE 3 END)
    );
    UPDATE anthem.event_interests
       SET reminded_3d = reminded_3d OR NOT r.is_tomorrow,
           reminded_1d = reminded_1d OR r.is_tomorrow
     WHERE event_id = r.event_id AND user_id = r.user_id;
    sent := sent + 1;
  END LOOP;
  RETURN sent;
END;
$$;

REVOKE ALL ON FUNCTION anthem.queue_event_reminders() FROM PUBLIC, anon, authenticated;

-- 09:00 Bangkok = 02:00 UTC, like the other SAMECOR daily jobs.
SELECT cron.unschedule('samecor-event-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'samecor-event-reminders');
SELECT cron.schedule('samecor-event-reminders', '0 2 * * *', $$select anthem.queue_event_reminders()$$);

-- Rollback:
-- SELECT cron.unschedule('samecor-event-reminders');
-- DROP FUNCTION IF EXISTS anthem.queue_event_reminders();
-- DROP FUNCTION IF EXISTS public.toggle_event_interest(uuid);
-- DROP TABLE IF EXISTS anthem.event_interests;
-- ALTER TABLE anthem.events DROP COLUMN IF EXISTS interest_count;
