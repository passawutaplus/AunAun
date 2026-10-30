-- Dashboard numbers for the LINE daily digest: traffic (vs previous 24 h), device split, top works, sources.
-- Replaces admin_line_digest(); same signature, extra keys (the edge function reads them).
-- Device split relies on props.device (added to the web tracker); older events count as "unknown".

CREATE OR REPLACE FUNCTION public.admin_line_digest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - interval '24 hours';
  prev  timestamptz := now() - interval '48 hours';
  test_ids uuid[];
  out jsonb;
BEGIN
  SELECT COALESCE(array_agg(id), '{}') INTO test_ids
    FROM auth.users
   WHERE email ~* '@example\.(com|test)$' OR lower(email) = 'tester@samecor.com';

  WITH ev AS (
    SELECT session_id, event_name, created_at, referrer, path,
           props ->> 'shell' AS shell, props ->> 'device' AS device, props ->> 'project_id' AS project_id,
           props ->> 'src' AS src
      FROM public.product_events
     WHERE created_at >= prev AND session_id IS NOT NULL
  ),
  sess AS (
    SELECT session_id,
           CASE
             WHEN bool_or(shell = 'android') THEN 'android'
             WHEN bool_or(device = 'mobile') THEN 'mobile'
             WHEN bool_or(device = 'tablet') THEN 'tablet'
             WHEN bool_or(device = 'desktop') THEN 'desktop'
             ELSE 'unknown'
           END AS dev,
           min(created_at) AS first_at
      FROM ev GROUP BY session_id
  ),
  entry AS (
    -- the referrer of each session's first page view in the last 24 h
    SELECT DISTINCT ON (session_id) session_id, referrer, path
      FROM ev WHERE event_name = 'page_view' AND created_at >= since
     ORDER BY session_id, created_at
  ),
  src AS (
    SELECT CASE
             WHEN path ~ '[?&]src=(qr|card|nfc)' OR referrer ~ 'src=(qr|card|nfc)' THEN 'QR / NFC'
             WHEN referrer ~* 'facebook\.com|fbclid' THEN 'Facebook'
             WHEN referrer ~* 'instagram\.com' THEN 'Instagram'
             WHEN referrer ~* 'line\.me|line\.naver' THEN 'LINE'
             WHEN referrer ~* 'google\.' THEN 'Google'
             WHEN referrer ~* 'android-app://' THEN 'แอป Android'
             WHEN referrer IS NULL OR referrer = '' THEN 'เข้าตรง'
             WHEN referrer ~* 'samecor\.com' THEN NULL
             ELSE 'เว็บอื่น'
           END AS label
      FROM entry
  )
  SELECT jsonb_build_object(
    'total_members',   (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL AND NOT (id = ANY (test_ids))),
    'new_members',     (SELECT count(*) FROM auth.users WHERE email_confirmed_at >= since AND NOT (id = ANY (test_ids))),
    'new_works',       (SELECT count(*) FROM anthem.projects WHERE created_at >= since AND status = 'Published' AND NOT (owner_id = ANY (test_ids))),
    'new_works_list',  COALESCE((
                         SELECT jsonb_agg(jsonb_build_object('title', left(t.title, 40), 'owner', t.owner))
                           FROM (SELECT p.title, pr.username AS owner
                                   FROM anthem.projects p LEFT JOIN public.profiles pr ON pr.id = p.owner_id
                                  WHERE p.created_at >= since AND p.status = 'Published' AND NOT (p.owner_id = ANY (test_ids))
                                  ORDER BY p.created_at DESC LIMIT 8) t), '[]'::jsonb),
    'feedback_24h',    (SELECT count(*) FROM anthem.app_feedback WHERE created_at >= since),
    'feedback_open',   (SELECT count(*) FROM anthem.app_feedback WHERE status = 'new'),
    'reports_open',    (SELECT count(*) FROM anthem.user_reports WHERE status IN ('open', 'reviewing')),
    'sessions_24h',    (SELECT count(DISTINCT session_id) FROM ev WHERE created_at >= since),
    'android_sessions_24h', (SELECT count(*) FROM sess WHERE dev = 'android' AND session_id IN (SELECT session_id FROM ev WHERE created_at >= since)),
    'sessions_prev',   (SELECT count(DISTINCT session_id) FROM ev WHERE created_at < since),
    'views_24h',       (SELECT count(*) FROM ev WHERE event_name = 'page_view' AND created_at >= since),
    'views_prev',      (SELECT count(*) FROM ev WHERE event_name = 'page_view' AND created_at < since),
    'devices',         COALESCE((
                         SELECT jsonb_object_agg(dev, n)
                           FROM (SELECT dev, count(*) AS n FROM sess
                                  WHERE session_id IN (SELECT session_id FROM ev WHERE created_at >= since) GROUP BY dev) d), '{}'::jsonb),
    'top_works',       COALESCE((
                         SELECT jsonb_agg(jsonb_build_object('title', left(x.title, 40), 'owner', x.owner, 'views', x.views))
                           FROM (SELECT p.title, pr.username AS owner, count(*) AS views
                                   FROM ev e
                                   JOIN anthem.projects p ON p.id::text = e.project_id
                                   LEFT JOIN public.profiles pr ON pr.id = p.owner_id
                                  WHERE e.event_name = 'project_view' AND e.created_at >= since
                                  GROUP BY p.title, pr.username
                                  ORDER BY views DESC LIMIT 3) x), '[]'::jsonb),
    'sources',         COALESCE((
                         SELECT jsonb_agg(jsonb_build_object('label', label, 'n', n))
                           FROM (SELECT label, count(*) AS n FROM src WHERE label IS NOT NULL
                                  GROUP BY label ORDER BY n DESC LIMIT 4) s), '[]'::jsonb)
  ) INTO out;
  RETURN out;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_line_digest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_line_digest() TO service_role;
