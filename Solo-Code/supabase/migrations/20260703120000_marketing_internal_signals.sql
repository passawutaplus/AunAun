-- Marketing module: internal in-app signals -> kuy_leads pipeline

ALTER TABLE shared.kuy_leads
  ADD COLUMN IF NOT EXISTS lead_origin text NOT NULL DEFAULT 'external';

CREATE INDEX IF NOT EXISTS kuy_leads_origin_idx
  ON shared.kuy_leads (business_id, lead_origin);

CREATE OR REPLACE FUNCTION public.marketing_sync_internal_signals(_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, shared, anthem, auth
AS \\$
DECLARE
  inserted_count integer := 0;
  row_count integer;
  site_base text := 'https://aplus1.app';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'login_required';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM shared.kuy_businesses b WHERE b.id = _business_id) THEN
    RAISE EXCEPTION 'business_not_found';
  END IF;

  INSERT INTO shared.kuy_leads (
    business_id, platform, source_url, lead_name, intent, pain_point,
    engagement, lead_score, status, tags, lead_origin
  )
  SELECT
    _business_id,
    'Website',
    site_base || '/admin/users?user_id=' || p.user_id::text,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Creator'),
    'creator_unpublished',
    'signed_up_3d_no_published_project',
    0,
    75,
    'new',
    ARRAY['internal', 'creator'],
    'internal'
  FROM public.profiles p
  WHERE p.created_at < now() - interval '3 days'
    AND NOT EXISTS (
      SELECT 1 FROM anthem.projects pr
      WHERE pr.owner_id = p.user_id AND pr.status = 'Published'
    )
    AND NOT EXISTS (
      SELECT 1 FROM shared.kuy_leads l
      WHERE l.business_id = _business_id
        AND l.source_url = site_base || '/admin/users?user_id=' || p.user_id::text
    );
  GET DIAGNOSTICS row_count = ROW_COUNT;
  inserted_count := inserted_count + row_count;

  INSERT INTO shared.kuy_leads (
    business_id, platform, source_url, lead_name, intent, pain_point,
    engagement, lead_score, status, tags, lead_origin
  )
  SELECT
    _business_id,
    'Website',
    site_base || '/admin/hiring?id=' || hr.id::text,
    coalesce(nullif(trim(hr.client_name), ''), 'Hiring request'),
    'hirer_stale',
    coalesce(nullif(trim(hr.project_title), ''), 'status_new_over_7d'),
    0,
    70,
    'new',
    ARRAY['internal', 'hirer'],
    'internal'
  FROM anthem.hiring_requests hr
  WHERE hr.status = E'\u0e43\u0e2b\u0e21\u0e48'
    AND hr.created_at < now() - interval '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM shared.kuy_leads l
      WHERE l.business_id = _business_id
        AND l.source_url = site_base || '/admin/hiring?id=' || hr.id::text
    );
  GET DIAGNOSTICS row_count = ROW_COUNT;
  inserted_count := inserted_count + row_count;

  INSERT INTO shared.kuy_leads (
    business_id, platform, source_url, lead_name, intent, pain_point,
    engagement, lead_score, status, tags, lead_origin
  )
  SELECT
    _business_id,
    'Website',
    site_base || '/admin/jobs?id=' || jp.id::text,
    coalesce(nullif(trim(jp.title), ''), 'Open job'),
    'open_job_no_applicants',
    'open_job_zero_applicants',
    coalesce(jp.views, 0),
    68,
    'new',
    ARRAY['internal', 'hirer', 'jobs'],
    'internal'
  FROM anthem.job_posts jp
  WHERE jp.status = 'open'
    AND coalesce(jp.applicants_count, 0) = 0
    AND NOT EXISTS (
      SELECT 1 FROM shared.kuy_leads l
      WHERE l.business_id = _business_id
        AND l.source_url = site_base || '/admin/jobs?id=' || jp.id::text
    );
  GET DIAGNOSTICS row_count = ROW_COUNT;
  inserted_count := inserted_count + row_count;

  INSERT INTO shared.kuy_leads (
    business_id, platform, source_url, lead_name, intent, pain_point,
    engagement, lead_score, status, tags, lead_origin
  )
  SELECT
    _business_id,
    'Website',
    site_base || '/admin/collabs?id=' || cr.id::text,
    'Collab request',
    'collab_pending',
    coalesce(left(cr.message, 120), 'status_new'),
    0,
    65,
    'new',
    ARRAY['internal', 'collab'],
    'internal'
  FROM anthem.collab_requests cr
  WHERE cr.status = E'\u0e43\u0e2b\u0e21\u0e48'
    AND NOT EXISTS (
      SELECT 1 FROM shared.kuy_leads l
      WHERE l.business_id = _business_id
        AND l.source_url = site_base || '/admin/collabs?id=' || cr.id::text
    );
  GET DIAGNOSTICS row_count = ROW_COUNT;
  inserted_count := inserted_count + row_count;

  INSERT INTO shared.kuy_leads (
    business_id, platform, source_url, lead_name, intent, pain_point,
    engagement, lead_score, status, tags, lead_origin
  )
  SELECT
    _business_id,
    'Website',
    site_base || '/admin/feedback?persona=' || sub.persona_slug,
    'UX: ' || sub.persona_label,
    'ux_pain_signal',
    sub.theme_summary,
    sub.cnt,
    60,
    'new',
    ARRAY['internal', 'ux'],
    'internal'
  FROM (
    SELECT
      lower(trim(ux.persona)) AS persona_slug,
      trim(ux.persona) AS persona_label,
      count(*)::int AS cnt,
      'ux_reviews_30d_' || count(*)::text AS theme_summary
    FROM anthem.ux_research_submissions ux
    WHERE ux.created_at >= now() - interval '30 days'
      AND coalesce(trim(ux.persona), '') <> ''
    GROUP BY lower(trim(ux.persona)), trim(ux.persona)
  ) sub
  WHERE NOT EXISTS (
    SELECT 1 FROM shared.kuy_leads l
    WHERE l.business_id = _business_id
      AND l.source_url = site_base || '/admin/feedback?persona=' || sub.persona_slug
  );
  GET DIAGNOSTICS row_count = ROW_COUNT;
  inserted_count := inserted_count + row_count;

  RETURN inserted_count;
END;
\\$;

GRANT EXECUTE ON FUNCTION public.marketing_sync_internal_signals(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
