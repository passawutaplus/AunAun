-- Redesign step 10 (My Studio → Insights + Overview "Views · 7D").
-- The mock charts views, new followers and likes per day (7D / 30D) with the change from the
-- period before. Followers and likes have timestamps already; views did not: the view RPC only
-- added 1 to projects.views, and project_views holds each signed-in viewer's own history (owners
-- cannot read it). So:
--   1. anthem.project_view_days — views per work per day (Bangkok time). No direct access (RLS on,
--      no policies); only the functions below write and read it.
--   2. Both increment_project_view functions (anthem + public) also count the day. Counting starts
--      when this runs; earlier days show 0.
--   3. public.studio_insights(p_days) — the caller's own numbers, one row per day for the last
--      2 × p_days days (the earlier half is "ช่วงก่อน"). Likes = picture likes (step 4).
-- Rollback: supabase/manual/rollback-20261128180000_redesign_studio_insights.sql

CREATE TABLE IF NOT EXISTS anthem.project_view_days (
  project_id uuid NOT NULL REFERENCES anthem.projects(id) ON DELETE CASCADE,
  day date NOT NULL,
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
  PRIMARY KEY (project_id, day)
);

ALTER TABLE anthem.project_view_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON anthem.project_view_days FROM anon, authenticated;

CREATE OR REPLACE FUNCTION anthem.increment_project_view(_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'anthem', 'shared', 'public'
AS $function$
BEGIN
  UPDATE anthem.projects
  SET views = coalesce(views, 0) + 1
  WHERE id = _project_id AND status = 'Published';
  IF FOUND THEN
    INSERT INTO anthem.project_view_days (project_id, day, views)
    VALUES (_project_id, (now() AT TIME ZONE 'Asia/Bangkok')::date, 1)
    ON CONFLICT (project_id, day) DO UPDATE SET views = anthem.project_view_days.views + 1;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_project_view(_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'anthem', 'public'
AS $function$
BEGIN
  PERFORM anthem.increment_project_view(_project_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.studio_insights(p_days integer)
 RETURNS TABLE (day date, views integer, followers integer, likes integer)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'anthem', 'public'
AS $function$
  WITH me AS (SELECT auth.uid() AS uid),
  span AS (
    SELECT least(greatest(coalesce(p_days, 7), 1), 90) AS n,
           (now() AT TIME ZONE 'Asia/Bangkok')::date AS today
  ),
  days AS (
    SELECT generate_series(span.today - (2 * span.n - 1), span.today, interval '1 day')::date AS day FROM span
  ),
  mine AS (
    SELECT p.id FROM anthem.projects p, me WHERE me.uid IS NOT NULL AND p.owner_id = me.uid
  ),
  v AS (
    SELECT d.day, sum(d.views)::integer AS n FROM anthem.project_view_days d JOIN mine ON mine.id = d.project_id, span
    WHERE d.day > span.today - 2 * span.n GROUP BY d.day
  ),
  f AS (
    SELECT (f.created_at AT TIME ZONE 'Asia/Bangkok')::date AS day, count(*)::integer AS n
    FROM anthem.follows f, me, span
    WHERE me.uid IS NOT NULL AND f.following_id = me.uid
      AND f.created_at >= ((span.today - (2 * span.n - 1))::timestamp AT TIME ZONE 'Asia/Bangkok')
    GROUP BY 1
  ),
  l AS (
    SELECT (l.created_at AT TIME ZONE 'Asia/Bangkok')::date AS day, count(*)::integer AS n
    FROM anthem.project_image_likes l JOIN mine ON mine.id = l.project_id, me, span
    WHERE l.user_id IS DISTINCT FROM me.uid
      AND l.created_at >= ((span.today - (2 * span.n - 1))::timestamp AT TIME ZONE 'Asia/Bangkok')
    GROUP BY 1
  )
  SELECT days.day, coalesce(v.n, 0), coalesce(f.n, 0), coalesce(l.n, 0)
  FROM days
  LEFT JOIN v ON v.day = days.day
  LEFT JOIN f ON f.day = days.day
  LEFT JOIN l ON l.day = days.day
  ORDER BY days.day;
$function$;

REVOKE ALL ON FUNCTION public.studio_insights(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.studio_insights(integer) TO authenticated;
