-- Weekly summary e-mail (owner 2026-11-28: "อีเมลสรุปรายสัปดาห์ ทำเลย"). Sent Mondays 09:00 Bangkok by the
-- edge function `weekly-digest` (cron: supabase/manual/setup-weekly-digest-cron.sql) to members who turned on
-- Settings → Notifications → "อีเมลสรุปรายสัปดาห์". Off by default, like the mock (Settings.dc.html week: false).
--   1. shared.notification_preferences.weekly + the "weekly" switch in notification_allowed(), get_my_settings(),
--      set_my_setting() (same way as the step 7c switches).
--   2. public.weekly_digest_members() — each member's last week (Mon–Sun, Bangkok): views, new followers,
--      picture likes, top work, and what they post (for the FOR YOU open-call ranking).
--   3. public.weekly_digest_board() — open calls closing in the next 14 days and events starting this week.
--   4. public.weekly_email_set() — the one-click turn-off link in every e-mail (the function checks the link).
--   5. anthem.run_weekly_digest() — what the cron calls (pg_net → edge function).
-- Only adds: the old site never reads these. Rollback: supabase/manual/rollback-20261129120000_redesign_weekly_email.sql

-- 1. The switch -------------------------------------------------------------------------------------------
ALTER TABLE shared.notification_preferences
  ADD COLUMN IF NOT EXISTS weekly boolean NOT NULL DEFAULT false;

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
    WHEN _kind IN ('weekly_digest', 'anthem_weekly_digest') THEN 'weekly'
    ELSE NULL
  END;
$$;

-- The weekly e-mail is opt-in (no row or no choice = off); every other switch is on until turned off.
CREATE OR REPLACE FUNCTION shared.notification_allowed(_user uuid, _kind text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE shared.notification_switch(_kind)
    WHEN 'weekly' THEN coalesce(
      (SELECT p.weekly FROM shared.notification_preferences p WHERE p.user_id = _user), false)
    ELSE coalesce(
      (SELECT CASE shared.notification_switch(_kind)
                WHEN 'chat' THEN p.chat
                WHEN 'comment' THEN p.comment
                WHEN 'follow' THEN p.follow
                WHEN 'event' THEN p.event
              END
         FROM shared.notification_preferences p
        WHERE p.user_id = _user),
      true)
  END;
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
    'weekly', coalesce(p.weekly, false),
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
  IF _key NOT IN ('chat', 'comment', 'follow', 'event', 'weekly') OR _value NOT IN ('true', 'false') THEN
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
         weekly = CASE WHEN _key = 'weekly' THEN on_ ELSE weekly END,
         updated_at = now()
   WHERE user_id = me;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_settings() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_setting(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_setting(text, text) TO authenticated;

-- 2. Each member's week ------------------------------------------------------------------------------------
-- Members with the switch on (or the `_only` list, for the function's dry run), active accounts with an
-- e-mail, in user_id order after `_after` (batches). Numbers like My Studio → Insights: views of their works,
-- new followers, likes on their pictures by other people; top work = most views, then likes (published only).
CREATE OR REPLACE FUNCTION public.weekly_digest_members(
  _week_start date,
  _after uuid DEFAULT NULL,
  _limit integer DEFAULT 50,
  _only uuid[] DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  username text,
  sc_categories text[],
  views integer,
  followers integer,
  likes integer,
  top_work jsonb,
  works jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH span AS (
    SELECT _week_start AS d0,
           _week_start + 6 AS d1,
           (_week_start::timestamp AT TIME ZONE 'Asia/Bangkok') AS t0,
           ((_week_start + 7)::timestamp AT TIME ZONE 'Asia/Bangkok') AS t1
  ),
  people AS (
    SELECT pr.user_id, u.email::text AS email, pr.display_name, pr.username, pr.sc_categories
      FROM public.profiles pr
      JOIN auth.users u ON u.id = pr.user_id
      LEFT JOIN shared.notification_preferences np ON np.user_id = pr.user_id
     WHERE CASE WHEN _only IS NULL THEN coalesce(np.weekly, false) ELSE pr.user_id = ANY (_only) END
       AND (_after IS NULL OR pr.user_id > _after)
       AND u.email IS NOT NULL
       AND u.deleted_at IS NULL
       AND (u.banned_until IS NULL OR u.banned_until < now())
       AND coalesce(pr.account_status, 'active') = 'active'
       AND pr.deactivated_at IS NULL
       AND pr.purge_after IS NULL
       AND pr.purged_at IS NULL
     ORDER BY pr.user_id
     LIMIT least(greatest(coalesce(_limit, 50), 1), 500)
  ),
  mine AS (
    SELECT p.id, p.owner_id, p.title, p.cover_url, p.cover_width, p.cover_height, p.status,
           p.sc_category, p.tags, p.tools, p.created_at
      FROM anthem.projects p
      JOIN people ON people.user_id = p.owner_id
  ),
  wv AS (
    SELECT d.project_id, sum(d.views)::integer AS n
      FROM anthem.project_view_days d
      JOIN mine ON mine.id = d.project_id
     CROSS JOIN span
     WHERE d.day BETWEEN span.d0 AND span.d1
     GROUP BY d.project_id
  ),
  wl AS (
    SELECT l.project_id, count(*)::integer AS n
      FROM anthem.project_image_likes l
      JOIN mine ON mine.id = l.project_id
     CROSS JOIN span
     WHERE l.user_id IS DISTINCT FROM mine.owner_id
       AND l.created_at >= span.t0 AND l.created_at < span.t1
     GROUP BY l.project_id
  ),
  wf AS (
    SELECT f.following_id AS user_id, count(*)::integer AS n
      FROM anthem.follows f
      JOIN people ON people.user_id = f.following_id
     CROSS JOIN span
     WHERE f.follower_id <> f.following_id
       AND f.created_at >= span.t0 AND f.created_at < span.t1
     GROUP BY f.following_id
  ),
  per_work AS (
    SELECT mine.*, coalesce(wv.n, 0) AS week_views, coalesce(wl.n, 0) AS week_likes
      FROM mine
      LEFT JOIN wv ON wv.project_id = mine.id
      LEFT JOIN wl ON wl.project_id = mine.id
  )
  SELECT people.user_id,
         people.email,
         people.display_name,
         people.username,
         people.sc_categories,
         coalesce((SELECT sum(w.week_views) FROM per_work w WHERE w.owner_id = people.user_id), 0)::integer,
         coalesce(wf.n, 0),
         coalesce((SELECT sum(w.week_likes) FROM per_work w WHERE w.owner_id = people.user_id), 0)::integer,
         (SELECT jsonb_build_object('id', w.id, 'title', w.title, 'cover_url', w.cover_url,
                                    'cover_width', w.cover_width, 'cover_height', w.cover_height,
                                    'views', w.week_views, 'likes', w.week_likes)
            FROM per_work w
           WHERE w.owner_id = people.user_id AND w.status = 'Published'
             AND (w.week_views > 0 OR w.week_likes > 0)
           ORDER BY w.week_views DESC, w.week_likes DESC, w.created_at DESC
           LIMIT 1),
         coalesce((SELECT jsonb_agg(jsonb_build_object('status', w.status, 'sc_category', w.sc_category,
                                                       'tags', w.tags, 'tools', w.tools))
                     FROM per_work w
                    WHERE w.owner_id = people.user_id AND w.status = 'Published'), '[]'::jsonb)
    FROM people
    LEFT JOIN wf ON wf.user_id = people.user_id
   ORDER BY people.user_id;
$$;

REVOKE ALL ON FUNCTION public.weekly_digest_members(date, uuid, integer, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_digest_members(date, uuid, integer, uuid[]) TO service_role;

-- 3. The same board for everyone: open calls closing in the 14 days from the sending Monday (closing day =
--    insights.deadline, else the last day, like the open-call reminders) and events starting that week.
CREATE OR REPLACE FUNCTION public.weekly_digest_board(_week_start date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH d AS (SELECT _week_start + 7 AS mon),
  calls AS (
    SELECT e.id, e.slug, e.title, e.description, e.insights, e.cover_url, e.location_name, e.starts_on, e.ends_on,
           coalesce(CASE WHEN (e.insights ->> 'deadline') ~ '^\d{4}-\d{2}-\d{2}$' THEN (e.insights ->> 'deadline')::date END,
                    e.ends_on) AS closes_on
      FROM anthem.events e
     WHERE e.category = 'open_call' AND e.status = 'published' AND e.parent_id IS NULL
  ),
  events AS (
    SELECT e.id, e.slug, e.title, e.category, e.cover_url, e.location_name, e.starts_on, e.ends_on, e.is_featured
      FROM anthem.events e, d
     WHERE e.category <> 'open_call' AND e.status = 'published' AND e.parent_id IS NULL
       AND e.starts_on BETWEEN d.mon AND d.mon + 6
  )
  SELECT jsonb_build_object(
    'open_calls', coalesce((
      SELECT jsonb_agg(to_jsonb(c) ORDER BY c.closes_on, c.title)
        FROM calls c, d
       WHERE c.closes_on BETWEEN d.mon AND d.mon + 13), '[]'::jsonb),
    'events', coalesce((
      SELECT jsonb_agg(to_jsonb(x) ORDER BY x.starts_on, x.is_featured DESC, x.title)
        FROM (SELECT * FROM events ORDER BY starts_on, is_featured DESC, title LIMIT 20) x), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.weekly_digest_board(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_digest_board(date) TO service_role;

-- 4. Turn the weekly e-mail off (or back on) from the link in the e-mail. The function checks the signed link.
CREATE OR REPLACE FUNCTION public.weekly_email_set(_user uuid, _on boolean)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO shared.notification_preferences AS p (user_id, weekly, updated_at)
  SELECT u.id, _on, now() FROM auth.users u WHERE u.id = _user
  ON CONFLICT (user_id) DO UPDATE SET weekly = EXCLUDED.weekly, updated_at = now()
  RETURNING p.weekly;
$$;

REVOKE ALL ON FUNCTION public.weekly_email_set(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.weekly_email_set(uuid, boolean) TO service_role;

-- 5. What the cron calls. Secret: Vault `weekly_digest_secret` if the owner ever adds one (same value as the
--    function's WEEKLY_DIGEST_SECRET), else the existing `push_dispatch_secret` (= PUSH_DISPATCH_SECRET).
CREATE OR REPLACE FUNCTION anthem.run_weekly_digest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT s.decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets s
   WHERE s.name IN ('weekly_digest_secret', 'push_dispatch_secret')
   ORDER BY (s.name = 'weekly_digest_secret') DESC
   LIMIT 1;
  IF v_secret IS NULL THEN
    RAISE WARNING 'weekly digest: no secret in vault — skipped';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://zkflkpbmbozrchqncpzi.supabase.co/functions/v1/weekly-digest',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
END;
$$;

REVOKE ALL ON FUNCTION anthem.run_weekly_digest() FROM PUBLIC, anon, authenticated;
