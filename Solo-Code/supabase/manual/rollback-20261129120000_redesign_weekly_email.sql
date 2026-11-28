-- Rollback of 20261129120000_redesign_weekly_email.sql (weekly summary e-mail).
-- Stops the cron, drops the new functions and the `weekly` column, and puts back the step 7c versions of
-- notification_switch / notification_allowed / get_my_settings / set_my_setting (20261128150000).
-- Also undeploy or leave the edge function `weekly-digest`: without these functions it sends nothing.

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'samecor-weekly-digest';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP FUNCTION IF EXISTS anthem.run_weekly_digest();
DROP FUNCTION IF EXISTS public.weekly_email_set(uuid, boolean);
DROP FUNCTION IF EXISTS public.weekly_digest_board(date);
DROP FUNCTION IF EXISTS public.weekly_digest_members(date, uuid, integer, uuid[]);

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

ALTER TABLE shared.notification_preferences DROP COLUMN IF EXISTS weekly;
