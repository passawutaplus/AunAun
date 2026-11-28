-- Redesign step 7c (Settings → Notifications / Privacy), owner 2026-11-28: the switches must really work.
--   Notifications: new message, comment, new follower, open call closing / event reminder. A switch that is off
--   stops the bell row (and so its push) at the source; e-mail and LINE senders ask notification_allowed() too.
--   Privacy: "who can greet me" (everyone / people I follow) is enforced when a connect chat is created.
--   "Show on Creators" and "Let Google find me" are keys of profiles.public_visibility (no SQL needed).
--   Also: open-call reminders count down to the closing day, and my_session_count() for Settings → devices.
-- Rollback: supabase/manual/rollback-20261128150000_redesign_account_settings.sql

-- 1. Notification switches, next to the existing "recommendations" one (owner-only table, RLS on, no policies).
ALTER TABLE shared.notification_preferences
  ADD COLUMN IF NOT EXISTS chat boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS comment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS follow boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS event boolean NOT NULL DEFAULT true;

-- Which switch a notification kind belongs to (in-app kinds, e-mail kinds and LINE kinds); NULL = no switch.
CREATE OR REPLACE FUNCTION shared.notification_switch(_kind text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN _kind IN ('chat.message', 'chat', 'anthem_chat') THEN 'chat'
    WHEN _kind IN ('project.comment', 'project.comment_reply', 'comment', 'anthem_comment') THEN 'comment'
    WHEN _kind IN ('social.follow', 'follow', 'anthem_follow') THEN 'follow'
    WHEN _kind IN ('event_reminder', 'anthem_event_reminder') THEN 'event'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION shared.notification_allowed(_user uuid, _kind text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT CASE shared.notification_switch(_kind)
              WHEN 'chat' THEN p.chat
              WHEN 'comment' THEN p.comment
              WHEN 'follow' THEN p.follow
              WHEN 'event' THEN p.event
            END
       FROM shared.notification_preferences p
      WHERE p.user_id = _user),
    true
  );
$$;

REVOKE ALL ON FUNCTION shared.notification_allowed(uuid, text) FROM PUBLIC, anon, authenticated;

-- For the edge functions (service role) that send e-mail and LINE.
CREATE OR REPLACE FUNCTION public.notification_allowed(_user uuid, _kind text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT shared.notification_allowed(_user, _kind);
$$;

REVOKE ALL ON FUNCTION public.notification_allowed(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notification_allowed(uuid, text) TO service_role;

-- Bell: a row whose switch is off is not written (so it is never pushed either).
CREATE OR REPLACE FUNCTION shared.skip_switched_off_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.app = 'anthem' AND NOT shared.notification_allowed(NEW.user_id, NEW.kind) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_skip_switched_off ON shared.notifications;
CREATE TRIGGER notifications_skip_switched_off
  BEFORE INSERT ON shared.notifications
  FOR EACH ROW EXECUTE FUNCTION shared.skip_switched_off_notification();

-- Push: also for chat rows that were written before the switch went off and get bumped later.
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
  IF NOT shared.notification_allowed(NEW.user_id, NEW.kind) THEN
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

-- 2. "Who can greet me": everyone (default) or only people I follow. Kept with the other chat settings.
ALTER TABLE anthem.chat_settings
  ADD COLUMN IF NOT EXISTS greet_from text NOT NULL DEFAULT 'everyone';
ALTER TABLE anthem.chat_settings DROP CONSTRAINT IF EXISTS chat_settings_greet_from_check;
ALTER TABLE anthem.chat_settings
  ADD CONSTRAINT chat_settings_greet_from_check CHECK (greet_from IN ('everyone', 'following'));

-- A new connect chat (the greeting) is refused when the other person only takes greetings from people they follow.
CREATE OR REPLACE FUNCTION shared.enforce_greet_from()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  sender uuid := coalesce(auth.uid(), NEW.created_by, NEW.client_id);
  recipient uuid;
BEGIN
  IF NEW.kind IS DISTINCT FROM 'connect' OR sender IS NULL THEN
    RETURN NEW;
  END IF;
  recipient := CASE WHEN NEW.client_id = sender THEN NEW.freelancer_id ELSE NEW.client_id END;
  IF recipient IS NULL OR recipient = sender THEN
    RETURN NEW;
  END IF;
  IF coalesce((SELECT cs.greet_from FROM anthem.chat_settings cs WHERE cs.user_id = recipient), 'everyone') = 'following'
     AND NOT EXISTS (SELECT 1 FROM anthem.follows f WHERE f.follower_id = recipient AND f.following_id = sender) THEN
    RAISE EXCEPTION 'คนนี้รับทักทายเฉพาะคนที่เขาติดตาม'
      USING ERRCODE = 'P0001', HINT = 'GREET_FOLLOWING_ONLY';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversations_greet_from ON shared.conversations;
CREATE TRIGGER trg_conversations_greet_from
  BEFORE INSERT ON shared.conversations
  FOR EACH ROW EXECUTE FUNCTION shared.enforce_greet_from();

-- 3. Read and write my switches (Settings → Notifications / Privacy).
CREATE OR REPLACE FUNCTION public.get_my_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'chat', coalesce(p.chat, true),
    'comment', coalesce(p.comment, true),
    'follow', coalesce(p.follow, true),
    'event', coalesce(p.event, true),
    'greet_from', coalesce((SELECT cs.greet_from FROM anthem.chat_settings cs WHERE cs.user_id = auth.uid()), 'everyone')
  )
  FROM (SELECT auth.uid() AS uid) me
  LEFT JOIN shared.notification_preferences p ON p.user_id = me.uid
  WHERE me.uid IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.set_my_setting(_key text, _value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  me uuid := auth.uid();
  on_ boolean;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  IF _key = 'greet_from' THEN
    IF _value NOT IN ('everyone', 'following') THEN
      RAISE EXCEPTION 'BAD_VALUE';
    END IF;
    INSERT INTO anthem.chat_settings (user_id, greet_from, updated_at)
    VALUES (me, _value, now())
    ON CONFLICT (user_id) DO UPDATE SET greet_from = EXCLUDED.greet_from, updated_at = now();
    RETURN;
  END IF;
  IF _key NOT IN ('chat', 'comment', 'follow', 'event') OR _value NOT IN ('true', 'false') THEN
    RAISE EXCEPTION 'BAD_KEY';
  END IF;
  on_ := _value = 'true';
  INSERT INTO shared.notification_preferences (user_id, updated_at) VALUES (me, now())
  ON CONFLICT (user_id) DO NOTHING;
  UPDATE shared.notification_preferences
     SET chat = CASE WHEN _key = 'chat' THEN on_ ELSE chat END,
         comment = CASE WHEN _key = 'comment' THEN on_ ELSE comment END,
         follow = CASE WHEN _key = 'follow' THEN on_ ELSE follow END,
         event = CASE WHEN _key = 'event' THEN on_ ELSE event END,
         updated_at = now()
   WHERE user_id = me;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_setting(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_setting(text, text) TO authenticated;

-- 4. Settings → devices: how many sessions this account has.
CREATE OR REPLACE FUNCTION public.my_session_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT count(*)::int
    FROM auth.sessions s
   WHERE s.user_id = auth.uid()
     AND (s.not_after IS NULL OR s.not_after > now());
$$;

REVOKE ALL ON FUNCTION public.my_session_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_session_count() TO authenticated;

-- 5. Event reminders: an open call counts down to its closing day (mock: "Open call ใกล้ปิดรับ · เหลือ 3 วัน");
--    other events still count down to their first day.
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
    SELECT x.event_id, x.user_id, x.due, x.open_call, x.body, (x.due = today + 1) AS is_tomorrow
    FROM (
      SELECT i.event_id, i.user_id, i.reminded_3d, i.reminded_1d,
             (e.category = 'open_call') AS open_call,
             CASE
               WHEN e.category = 'open_call' THEN coalesce(
                 CASE WHEN (e.insights ->> 'deadline') ~ '^\d{4}-\d{2}-\d{2}$' THEN (e.insights ->> 'deadline')::date END,
                 e.ends_on, e.starts_on)
               ELSE e.starts_on
             END AS due,
             CASE WHEN p.id IS NOT NULL THEN p.title || ' · ' || e.title
                  ELSE e.title || coalesce(' · ' || e.location_name, '') END AS body
      FROM anthem.event_interests i
      JOIN anthem.events e ON e.id = i.event_id
      LEFT JOIN anthem.events p ON p.id = e.parent_id
      WHERE e.status = 'published'
    ) x
    WHERE (x.due = today + 3 AND NOT x.reminded_3d) OR (x.due = today + 1 AND NOT x.reminded_1d)
  LOOP
    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    VALUES (
      r.user_id, 'anthem', 'event_reminder',
      CASE
        WHEN r.open_call AND r.is_tomorrow THEN 'Open call ที่คุณสนใจปิดรับพรุ่งนี้'
        WHEN r.open_call THEN 'Open call ที่คุณสนใจปิดรับในอีก 3 วัน'
        WHEN r.is_tomorrow THEN 'งานที่คุณสนใจเริ่มพรุ่งนี้'
        ELSE 'งานที่คุณสนใจเริ่มในอีก 3 วัน'
      END,
      r.body,
      '/exhibition/' || r.event_id,
      jsonb_build_object('event_id', r.event_id, 'starts_on', CASE WHEN r.open_call THEN NULL ELSE r.due END, 'due', r.due,
                         'days_before', CASE WHEN r.is_tomorrow THEN 1 ELSE 3 END)
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
