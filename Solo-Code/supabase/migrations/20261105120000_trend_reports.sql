-- Weekly trend report (AI routine, Mondays 08:00 Bangkok).
-- The routine reads platform stats and posts the finished report through the `trend-report`
-- edge function (shared secret); the full report lives in a Google Doc, the admin LINE group
-- gets a short summary with a button to the Doc via the existing outbox → line-admin-notify path.
-- Nothing here is readable by anon / signed-in users: the repo is public, the data is not.

CREATE TABLE IF NOT EXISTS public.trend_reports (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of    date        NOT NULL UNIQUE,
  title      text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  summary    jsonb       NOT NULL CHECK (jsonb_typeof(summary) = 'array' AND jsonb_array_length(summary) BETWEEN 1 AND 7),
  doc_url    text        NOT NULL CHECK (doc_url ~ '^https://docs\.google\.com/document/d/[A-Za-z0-9_-]+'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trend_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trend_reports FROM anon, authenticated;
GRANT SELECT ON public.trend_reports TO authenticated;
DROP POLICY IF EXISTS trend_reports_admin_read ON public.trend_reports;
CREATE POLICY trend_reports_admin_read ON public.trend_reports
  FOR SELECT TO authenticated USING (public.has_role((SELECT auth.uid()), 'admin'));

ALTER TABLE public.admin_line_outbox DROP CONSTRAINT IF EXISTS admin_line_outbox_kind_check;
ALTER TABLE public.admin_line_outbox ADD CONSTRAINT admin_line_outbox_kind_check
  CHECK (kind = ANY (ARRAY['member', 'feedback', 'report', 'digest', 'event', 'trend']));

-- Aggregates only (no names, emails or ids of people): what happened on SAMECOR in the last _days.
CREATE OR REPLACE FUNCTION public.trend_platform_stats(_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
  WITH w AS (SELECT now() - make_interval(days => greatest(1, least(_days, 31))) AS since)
  SELECT jsonb_build_object(
    'days', greatest(1, least(_days, 31)),
    'new_members', (SELECT count(*) FROM auth.users u, w WHERE u.created_at >= w.since),
    'new_works', (SELECT count(*) FROM anthem.projects p, w WHERE p.status = 'Published' AND p.created_at >= w.since),
    'work_views', (SELECT count(*) FROM anthem.project_views v, w WHERE v.viewed_at >= w.since),
    'work_likes', (SELECT count(*) FROM anthem.project_likes l, w WHERE l.created_at >= w.since),
    'new_follows', (SELECT count(*) FROM anthem.follows f, w WHERE f.created_at >= w.since),
    'top_categories', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('category', category, 'views', n) ORDER BY n DESC), '[]'::jsonb)
      FROM (SELECT p.category, count(*) n FROM anthem.project_views v JOIN anthem.projects p ON p.id = v.project_id, w
            WHERE v.viewed_at >= w.since AND p.category IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8) c),
    'top_tags', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('tag', tag, 'works', n) ORDER BY n DESC), '[]'::jsonb)
      FROM (SELECT t AS tag, count(*) n FROM anthem.projects p CROSS JOIN LATERAL unnest(p.tags) t, w
            WHERE p.status = 'Published' AND p.created_at >= w.since - interval '60 days'
              AND t NOT LIKE '%:%' -- internal tags such as catsub:photography
            GROUP BY 1 ORDER BY 2 DESC LIMIT 12) t),
    'top_tools', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('tool', tool, 'works', n) ORDER BY n DESC), '[]'::jsonb)
      FROM (SELECT t AS tool, count(*) n FROM anthem.projects p CROSS JOIN LATERAL unnest(p.tools) t, w
            WHERE p.status = 'Published' AND p.created_at >= w.since - interval '60 days' GROUP BY 1 ORDER BY 2 DESC LIMIT 10) t),
    'top_searches', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('query', query_text, 'searches', s, 'zero_results', z) ORDER BY s DESC), '[]'::jsonb)
      FROM (SELECT query_text, sum(searches) s, sum(zero_results) z FROM public.search_daily, w
            WHERE day >= w.since::date AND char_length(query_text) BETWEEN 2 AND 60 GROUP BY 1 HAVING sum(searches) >= 2
            ORDER BY 2 DESC LIMIT 15) q),
    'searches_without_results', (
      SELECT coalesce(jsonb_agg(query_text ORDER BY z DESC), '[]'::jsonb)
      FROM (SELECT query_text, sum(zero_results) z FROM public.search_daily, w
            WHERE day >= w.since::date AND char_length(query_text) BETWEEN 2 AND 60 GROUP BY 1 HAVING sum(zero_results) >= 2
            ORDER BY 2 DESC LIMIT 10) q),
    'events', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('title', title, 'category', category, 'interested', interest_count, 'views', view_count)
                                ORDER BY interest_count DESC, view_count DESC), '[]'::jsonb)
      FROM (SELECT title, category, interest_count, view_count FROM anthem.events
            WHERE status = 'published' AND coalesce(ends_on, starts_on) >= current_date
            ORDER BY interest_count DESC, view_count DESC LIMIT 8) e)
  );
$$;

-- Save (or replace) this week's report and queue the LINE summary.
CREATE OR REPLACE FUNCTION public.trend_report_publish(_week_of date, _title text, _summary jsonb, _doc_url text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.trend_reports (week_of, title, summary, doc_url)
  VALUES (_week_of, btrim(_title), _summary, btrim(_doc_url))
  ON CONFLICT (week_of) DO UPDATE
    SET title = EXCLUDED.title, summary = EXCLUDED.summary, doc_url = EXCLUDED.doc_url, updated_at = now()
  RETURNING id INTO v_id;
  PERFORM public.admin_line_enqueue('trend', v_id);
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.trend_platform_stats(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trend_report_publish(date, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trend_platform_stats(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.trend_report_publish(date, text, jsonb, text) TO service_role;

-- Rollback:
-- DROP FUNCTION IF EXISTS public.trend_report_publish(date, text, jsonb, text);
-- DROP FUNCTION IF EXISTS public.trend_platform_stats(integer);
-- DROP TABLE IF EXISTS public.trend_reports;
