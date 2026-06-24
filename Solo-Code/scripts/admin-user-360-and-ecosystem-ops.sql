-- Admin User 360 + Ecosystem Ops dashboard stats (Ops Hub + So1o Mission Control)

CREATE OR REPLACE FUNCTION public.admin_user_360(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _profile jsonb;
  _quotations integer := 0;
  _open_tickets integer := 0;
  _meeting_captures integer := 0;
  _meeting_recent jsonb := '[]'::jsonb;
  _drill_rerolls_today integer := 0;
  _projects integer := 0;
  _published integer := 0;
  _feedback integer := 0;
  _drill_posts integer := 0;
  _cross_links integer := 0;
  _converted_links integer := 0;
  _drill_links integer := 0;
  _recent_links jsonb := '[]'::jsonb;
  _recent_events jsonb := '[]'::jsonb;
  _day text := public._design_drill_day_key();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT jsonb_build_object(
    'user_id', p.user_id,
    'display_name', p.display_name,
    'username', p.username,
    'subscription_tier', p.subscription_tier,
    'created_at', p.created_at
  )
  INTO _profile
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;

  IF _profile IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*)::integer INTO _quotations
  FROM public.quotations q WHERE q.user_id = _user_id;

  SELECT count(*)::integer INTO _open_tickets
  FROM public.support_tickets t
  WHERE t.user_id = _user_id
    AND t.status NOT IN ('closed', 'wont_fix');

  SELECT count(*)::integer INTO _meeting_captures
  FROM public.meeting_captures mc WHERE mc.user_id = _user_id;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO _meeting_recent
  FROM (
    SELECT mc.id, mc.title, mc.status, mc.duration_sec, mc.created_at
    FROM public.meeting_captures mc
    WHERE mc.user_id = _user_id
    ORDER BY mc.created_at DESC
    LIMIT 3
  ) x;

  SELECT coalesce(u.used_count, 0)::integer INTO _drill_rerolls_today
  FROM public.design_drill_reroll_usage u
  WHERE u.user_id = _user_id AND u.day_key = _day;

  SELECT count(*)::integer INTO _projects
  FROM anthem.projects pr WHERE pr.owner_id = _user_id;

  SELECT count(*)::integer INTO _published
  FROM anthem.projects pr
  WHERE pr.owner_id = _user_id AND pr.status = 'Published';

  SELECT count(*)::integer INTO _drill_posts
  FROM anthem.projects pr
  WHERE pr.owner_id = _user_id
    AND pr.tags @> ARRAY['So1oDrill']::text[];

  BEGIN
    SELECT count(*)::integer INTO _feedback
    FROM anthem.app_feedback af WHERE af.user_id = _user_id;
  EXCEPTION WHEN undefined_table THEN
    _feedback := 0;
  END;

  SELECT count(*)::integer INTO _cross_links
  FROM public.ecosystem_links el WHERE el.user_id = _user_id;

  SELECT count(*)::integer INTO _converted_links
  FROM public.ecosystem_links el
  WHERE el.user_id = _user_id
    AND el.meta ? 'converted_at'
    AND el.meta->>'converted_at' IS NOT NULL
    AND el.meta->>'converted_at' <> '';

  SELECT count(*)::integer INTO _drill_links
  FROM public.ecosystem_links el
  WHERE el.user_id = _user_id AND el.source_page = 'design_drill';

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO _recent_links
  FROM (
    SELECT el.id, el.source_app, el.source_page, el.created_at,
      (el.meta ? 'converted_at' AND el.meta->>'converted_at' IS NOT NULL AND el.meta->>'converted_at' <> '') AS converted
    FROM public.ecosystem_links el
    WHERE el.user_id = _user_id
    ORDER BY el.created_at DESC
    LIMIT 8
  ) x;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO _recent_events
  FROM (
    SELECT pe.event_type, pe.created_at, pe.target_type
    FROM public.platform_events pe
    WHERE pe.actor_id = _user_id
    ORDER BY pe.created_at DESC
    LIMIT 10
  ) x;

  RETURN jsonb_build_object(
    'profile', _profile,
    'so1o', jsonb_build_object(
      'quotations', _quotations,
      'open_tickets', _open_tickets,
      'meeting_captures', _meeting_captures,
      'meeting_captures_recent', _meeting_recent,
      'drill_rerolls_today', _drill_rerolls_today
    ),
    'an1hem', jsonb_build_object(
      'projects', _projects,
      'published', _published,
      'feedback', _feedback,
      'drill_posts', _drill_posts
    ),
    'ecosystem', jsonb_build_object(
      'cross_links', _cross_links,
      'converted_links', _converted_links,
      'drill_links', _drill_links
    ),
    'recent_links', _recent_links,
    'recent_events', _recent_events
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_360(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_ecosystem_ops_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  _day text := public._design_drill_day_key();
  _since_7d timestamptz := now() - interval '7 days';
  _rerolls_today integer := 0;
  _rerolls_7d integer := 0;
  _drill_links_7d integer := 0;
  _drill_converted_7d integer := 0;
  _drill_posts_total integer := 0;
  _top_users jsonb := '[]'::jsonb;
  _captures_total integer := 0;
  _by_status jsonb := '{}'::jsonb;
  _meeting_credits_7d integer := 0;
  _meeting_recent jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT coalesce(sum(used_count), 0)::integer INTO _rerolls_today
  FROM public.design_drill_reroll_usage
  WHERE day_key = _day;

  SELECT coalesce(sum(used_count), 0)::integer INTO _rerolls_7d
  FROM public.design_drill_reroll_usage
  WHERE updated_at >= _since_7d;

  SELECT count(*)::integer INTO _drill_links_7d
  FROM public.ecosystem_links el
  WHERE el.source_page = 'design_drill'
    AND el.created_at >= _since_7d;

  SELECT count(*)::integer INTO _drill_converted_7d
  FROM public.ecosystem_links el
  WHERE el.source_page = 'design_drill'
    AND el.created_at >= _since_7d
    AND el.meta ? 'converted_at'
    AND el.meta->>'converted_at' IS NOT NULL
    AND el.meta->>'converted_at' <> '';

  SELECT count(*)::integer INTO _drill_posts_total
  FROM anthem.projects pr
  WHERE pr.tags @> ARRAY['So1oDrill']::text[];

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.score DESC), '[]'::jsonb)
  INTO _top_users
  FROM (
    SELECT
      coalesce(r.user_id, l.user_id) AS user_id,
      coalesce(r.used_count, 0) AS rerolls_today,
      coalesce(l.link_count, 0) AS drill_links_7d,
      (coalesce(r.used_count, 0) + coalesce(l.link_count, 0)) AS score
    FROM (
      SELECT user_id, used_count
      FROM public.design_drill_reroll_usage
      WHERE day_key = _day AND used_count > 0
    ) r
    FULL OUTER JOIN (
      SELECT user_id, count(*)::integer AS link_count
      FROM public.ecosystem_links
      WHERE source_page = 'design_drill' AND created_at >= _since_7d
      GROUP BY user_id
    ) l ON l.user_id = r.user_id
    ORDER BY (coalesce(r.used_count, 0) + coalesce(l.link_count, 0)) DESC
    LIMIT 15
  ) x;

  SELECT count(*)::integer INTO _captures_total
  FROM public.meeting_captures;

  SELECT coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
  INTO _by_status
  FROM (
    SELECT status, count(*)::integer AS cnt
    FROM public.meeting_captures
    GROUP BY status
  ) s;

  SELECT coalesce(sum(cost), 0)::integer INTO _meeting_credits_7d
  FROM public.ai_credit_ledger
  WHERE created_at >= _since_7d
    AND feature LIKE 'ai_meeting_%';

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO _meeting_recent
  FROM (
    SELECT mc.id, mc.user_id, mc.title, mc.status, mc.duration_sec, mc.created_at
    FROM public.meeting_captures mc
    ORDER BY mc.created_at DESC
    LIMIT 20
  ) x;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'day_key', _day,
    'drill', jsonb_build_object(
      'rerolls_today', _rerolls_today,
      'rerolls_7d', _rerolls_7d,
      'cross_links_7d', _drill_links_7d,
      'cross_links_converted_7d', _drill_converted_7d,
      'conversion_pct', CASE
        WHEN _drill_links_7d > 0 THEN round((_drill_converted_7d::numeric / _drill_links_7d) * 100)
        ELSE 0
      END,
      'drill_posts_total', _drill_posts_total,
      'top_users', _top_users
    ),
    'meeting', jsonb_build_object(
      'captures_total', _captures_total,
      'by_status', _by_status,
      'credits_7d', _meeting_credits_7d,
      'recent', _meeting_recent
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ecosystem_ops_stats() TO authenticated;
