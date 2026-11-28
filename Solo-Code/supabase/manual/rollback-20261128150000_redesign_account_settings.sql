-- Rollback of 20261128150000_redesign_account_settings.sql. The switch columns are dropped (their values are lost).

DROP TRIGGER IF EXISTS notifications_skip_switched_off ON shared.notifications;
DROP FUNCTION IF EXISTS shared.skip_switched_off_notification();
DROP TRIGGER IF EXISTS trg_conversations_greet_from ON shared.conversations;
DROP FUNCTION IF EXISTS shared.enforce_greet_from();
DROP FUNCTION IF EXISTS public.get_my_settings();
DROP FUNCTION IF EXISTS public.set_my_setting(text, text);
DROP FUNCTION IF EXISTS public.my_session_count();

CREATE OR REPLACE FUNCTION shared.dispatch_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_secret text;
BEGIN
  IF NEW.app IS DISTINCT FROM 'anthem' THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM shared.push_subscriptions s WHERE s.user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'push_dispatch_secret' LIMIT 1;
  IF v_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://zkflkpbmbozrchqncpzi.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', v_secret),
    body := jsonb_build_object('notification_id', NEW.id),
    timeout_milliseconds := 10000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'dispatch_push_notification skipped: %', SQLERRM;
  RETURN NEW;
END $function$;

DROP FUNCTION IF EXISTS public.notification_allowed(uuid, text);
DROP FUNCTION IF EXISTS shared.notification_allowed(uuid, text);
DROP FUNCTION IF EXISTS shared.notification_switch(text);

ALTER TABLE shared.notification_preferences
  DROP COLUMN IF EXISTS chat,
  DROP COLUMN IF EXISTS comment,
  DROP COLUMN IF EXISTS follow,
  DROP COLUMN IF EXISTS event;

ALTER TABLE anthem.chat_settings DROP CONSTRAINT IF EXISTS chat_settings_greet_from_check;
ALTER TABLE anthem.chat_settings DROP COLUMN IF EXISTS greet_from;

-- Event reminders count down to the first day again (definition of 20261107100000).
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
    SELECT i.event_id, i.user_id, e.starts_on,
           CASE WHEN p.id IS NOT NULL THEN p.title || ' · ' || e.title
                ELSE e.title || coalesce(' · ' || e.location_name, '') END AS body,
           (e.starts_on = today + 1) AS is_tomorrow
    FROM anthem.event_interests i
    JOIN anthem.events e ON e.id = i.event_id
    LEFT JOIN anthem.events p ON p.id = e.parent_id
    WHERE e.status = 'published'
      AND ((e.starts_on = today + 3 AND NOT i.reminded_3d) OR (e.starts_on = today + 1 AND NOT i.reminded_1d))
  LOOP
    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    VALUES (
      r.user_id, 'anthem', 'event_reminder',
      CASE WHEN r.is_tomorrow THEN 'งานที่คุณสนใจเริ่มพรุ่งนี้' ELSE 'งานที่คุณสนใจเริ่มในอีก 3 วัน' END,
      r.body,
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
