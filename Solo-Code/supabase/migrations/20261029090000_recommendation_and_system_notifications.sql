-- Recommendation + system notifications for SAMECOR. Every row lands in shared.notifications,
-- so the in-app bell shows it and the push trigger (20261028090000_push_notifications.sql)
-- delivers it to phones.
--
--   rec.following       daily 19:00 Bangkok: up to 2 new works from people you follow
--   rec.weekly          Friday 19:05 Bangkok: up to 3 picks, weighted to the category you engage with
--   system.milestone    your work reached 10 / 50 / 100 / 500 / 1000 likes
--   system.announcement admin broadcast (admin_broadcast_notification)
--
-- Recommendations go only to people with a registered device, at most one per ~day, and never
-- to anyone who switched them off (shared.notification_preferences.recommendations = false).

CREATE TABLE IF NOT EXISTS shared.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  recommendations boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shared.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_notification_preferences()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'recommendations',
    coalesce((SELECT p.recommendations FROM shared.notification_preferences p WHERE p.user_id = auth.uid()), true)
  );
$$;

CREATE OR REPLACE FUNCTION public.set_recommendation_notifications(_on boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  INSERT INTO shared.notification_preferences (user_id, recommendations, updated_at)
  VALUES (auth.uid(), coalesce(_on, true), now())
  ON CONFLICT (user_id) DO UPDATE SET recommendations = EXCLUDED.recommendations, updated_at = now();
END $$;

REVOKE EXECUTE ON FUNCTION public.get_notification_preferences() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_recommendation_notifications(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_notification_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_recommendation_notifications(boolean) TO authenticated;

-- People who may receive a recommendation right now.
CREATE OR REPLACE FUNCTION shared.recommendation_recipients()
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT s.user_id
  FROM shared.push_subscriptions s
  WHERE NOT EXISTS (
      SELECT 1 FROM shared.notification_preferences p
      WHERE p.user_id = s.user_id AND p.recommendations = false
    )
    AND NOT EXISTS (
      SELECT 1 FROM shared.notifications n
      WHERE n.user_id = s.user_id AND n.kind LIKE 'rec.%' AND n.created_at > now() - interval '20 hours'
    );
$$;

CREATE OR REPLACE FUNCTION anthem.queue_following_digest()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inserted integer;
BEGIN
  WITH cand AS (
    SELECT r.user_id, p.id, p.title, p.owner_id,
           row_number() OVER (PARTITION BY r.user_id ORDER BY p.likes DESC NULLS LAST, p.created_at DESC) AS rn
    FROM shared.recommendation_recipients() r
    JOIN anthem.follows f ON f.follower_id = r.user_id
    JOIN anthem.projects p
      ON p.owner_id = f.following_id
     AND p.status = 'Published'
     AND p.created_at > now() - interval '26 hours'
     AND p.owner_id <> r.user_id
    WHERE NOT EXISTS (SELECT 1 FROM anthem.project_views v WHERE v.user_id = r.user_id AND v.project_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM anthem.project_likes l WHERE l.user_id = r.user_id AND l.project_id = p.id)
  ),
  picked AS (
    SELECT user_id,
           array_agg(id ORDER BY rn) AS ids,
           array_agg(owner_id ORDER BY rn) AS owners,
           array_agg(title ORDER BY rn) AS titles
    FROM cand WHERE rn <= 2
    GROUP BY user_id
  ),
  named AS (
    SELECT pk.*,
           coalesce(nullif(trim(a.display_name), ''), a.username, 'ครีเอเตอร์') AS name1,
           coalesce(nullif(trim(b.display_name), ''), b.username, 'ครีเอเตอร์') AS name2
    FROM picked pk
    LEFT JOIN public.profiles a ON a.user_id = pk.owners[1]
    LEFT JOIN public.profiles b ON b.user_id = pk.owners[2]
  ),
  ins AS (
    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    SELECT user_id, 'anthem', 'rec.following', 'New from people you follow',
           CASE
             WHEN cardinality(ids) = 1 THEN name1 || ' ลงผลงานใหม่ — ' || coalesce(titles[1], '')
             WHEN owners[1] = owners[2] THEN name1 || ' ลงผลงานใหม่ 2 ชิ้น'
             ELSE name1 || ' และ ' || name2 || ' ลงผลงานใหม่'
           END,
           '/project/' || ids[1],
           jsonb_build_object('project_ids', to_jsonb(ids), 'actor_id', owners[1],
                              'idempotency_key', 'rec.following:' || user_id || ':' || current_date)
    FROM named
    RETURNING 1
  )
  SELECT count(*) INTO inserted FROM ins;
  RETURN inserted;
END $$;

CREATE OR REPLACE FUNCTION anthem.queue_weekly_picks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inserted integer;
BEGIN
  WITH recipients AS (
    SELECT r.user_id,
           (SELECT p.category
              FROM (
                SELECT l.project_id FROM anthem.project_likes l
                 WHERE l.user_id = r.user_id AND l.created_at > now() - interval '60 days'
                UNION ALL
                SELECT v.project_id FROM anthem.project_views v
                 WHERE v.user_id = r.user_id AND v.viewed_at > now() - interval '60 days'
              ) seen
              JOIN anthem.projects p ON p.id = seen.project_id
             WHERE p.category IS NOT NULL
             GROUP BY p.category
             ORDER BY count(*) DESC
             LIMIT 1) AS fav_category
    FROM shared.recommendation_recipients() r
  ),
  cand AS (
    SELECT r.user_id, r.fav_category, p.id, p.title, p.category,
           row_number() OVER (
             PARTITION BY r.user_id
             ORDER BY (p.category IS NOT DISTINCT FROM r.fav_category) DESC,
                      p.likes DESC NULLS LAST, p.views DESC NULLS LAST, p.created_at DESC
           ) AS rn
    FROM recipients r
    JOIN anthem.projects p
      ON p.status = 'Published'
     AND p.owner_id <> r.user_id
     AND p.cover_url IS NOT NULL
     AND p.created_at > now() - interval '90 days'
    WHERE NOT EXISTS (SELECT 1 FROM anthem.project_views v WHERE v.user_id = r.user_id AND v.project_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM anthem.project_likes l WHERE l.user_id = r.user_id AND l.project_id = p.id)
  ),
  picked AS (
    SELECT user_id,
           max(fav_category) AS fav_category,
           bool_and(category IS NOT DISTINCT FROM fav_category) AS all_in_fav,
           array_agg(id ORDER BY rn) AS ids,
           array_agg(title ORDER BY rn) AS titles
    FROM cand WHERE rn <= 3
    GROUP BY user_id
    HAVING count(*) >= 2
  ),
  ins AS (
    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    SELECT user_id, 'anthem', 'rec.weekly', 'Picked for you this week',
           cardinality(ids) ||
           CASE WHEN all_in_fav AND fav_category IS NOT NULL
                THEN ' ผลงานจากหมวด ' || fav_category || ' ที่คุณชอบ — '
                ELSE ' ผลงานที่กำลังมาแรงบน SAMECOR — '
           END ||
           coalesce(titles[1], '') || ', ' || coalesce(titles[2], '') ||
           CASE WHEN cardinality(ids) > 2 THEN ' และอีก 1' ELSE '' END,
           '/project/' || ids[1],
           jsonb_build_object('project_ids', to_jsonb(ids), 'category', fav_category,
                              'idempotency_key', 'rec.weekly:' || user_id || ':' || current_date)
    FROM picked
    RETURNING 1
  )
  SELECT count(*) INTO inserted FROM ins;
  RETURN inserted;
END $$;

-- A work reaches a like milestone → tell its owner (never blocks the like).
CREATE OR REPLACE FUNCTION anthem.notify_like_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  n integer;
  proj record;
  mkey text;
BEGIN
  SELECT count(*) INTO n FROM anthem.project_likes WHERE project_id = NEW.project_id;
  IF n NOT IN (10, 50, 100, 500, 1000) THEN
    RETURN NEW;
  END IF;
  SELECT id, owner_id, title INTO proj FROM anthem.projects WHERE id = NEW.project_id;
  IF proj.owner_id IS NULL OR proj.owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  mkey := proj.id || ':' || n;
  IF EXISTS (
    SELECT 1 FROM shared.notifications
    WHERE user_id = proj.owner_id AND kind = 'system.milestone' AND metadata->>'milestone_key' = mkey
  ) THEN
    RETURN NEW;
  END IF;
  INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
  VALUES (
    proj.owner_id, 'anthem', 'system.milestone',
    'Your work hit ' || n || ' likes',
    coalesce(proj.title, 'ผลงานของคุณ') || ' — มีคนถูกใจครบ ' || n || ' ครั้งแล้ว',
    '/project/' || proj.id,
    jsonb_build_object('project_id', proj.id, 'likes', n, 'milestone_key', mkey)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_like_milestone skipped: %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS project_likes_milestone ON anthem.project_likes;
CREATE TRIGGER project_likes_milestone
  AFTER INSERT ON anthem.project_likes
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_like_milestone();

-- Admin announcement to every account (bell + push).
CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(_title text, _body text, _link text DEFAULT '/')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inserted integer;
  safe_link text := CASE WHEN coalesce(_link, '') ~ '^/[^/]' OR _link = '/' THEN _link ELSE '/' END;
BEGIN
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์';
  END IF;
  IF coalesce(trim(_title), '') = '' THEN
    RAISE EXCEPTION 'TITLE_REQUIRED';
  END IF;
  INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
  SELECT u.id, 'anthem', 'system.announcement', left(trim(_title), 80), left(coalesce(_body, ''), 300), safe_link,
         jsonb_build_object('broadcast_by', auth.uid(), 'broadcast_at', now())
  FROM auth.users u;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_broadcast_notification(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notification(text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION shared.recommendation_recipients() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION anthem.queue_following_digest() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION anthem.queue_weekly_picks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION anthem.notify_like_milestone() FROM PUBLIC, anon, authenticated;

-- 19:00 / 19:05 Bangkok (12:00 / 12:05 UTC). Weekly runs after the digest, so a Friday digest
-- recipient is skipped by the 20-hour cap instead of getting two pushes.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('samecor-following-digest', 'samecor-weekly-picks');
SELECT cron.schedule('samecor-following-digest', '0 12 * * *', 'select anthem.queue_following_digest()');
SELECT cron.schedule('samecor-weekly-picks', '5 12 * * 5', 'select anthem.queue_weekly_picks()');
