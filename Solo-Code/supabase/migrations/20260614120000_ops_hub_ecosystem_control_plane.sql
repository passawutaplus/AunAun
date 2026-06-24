-- Ops Hub Ecosystem Control Plane — connections, user 360, events, radar, settings

CREATE TABLE IF NOT EXISTS public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  actor_id uuid,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_events_created_idx
  ON public.platform_events (created_at DESC);

CREATE INDEX IF NOT EXISTS platform_events_type_idx
  ON public.platform_events (event_type, created_at DESC);

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read platform events" ON public.platform_events;
CREATE POLICY "Admins read platform events"
  ON public.platform_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages platform events" ON public.platform_events;
CREATE POLICY "Service role manages platform events"
  ON public.platform_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_platform_event(
  p_event_type text,
  p_actor_id uuid DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.platform_events (event_type, actor_id, target_type, target_id, metadata)
  VALUES (p_event_type, p_actor_id, p_target_type, p_target_id, COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_platform_event(text, uuid, text, text, jsonb) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins read all ecosystem links" ON public.ecosystem_links;
CREATE POLICY "Admins read all ecosystem links"
  ON public.ecosystem_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS ops.radar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  source text NOT NULL DEFAULT 'manual',
  category text NOT NULL DEFAULT 'product'
    CHECK (category IN ('product', 'tech', 'infra', 'market', 'compliance')),
  impact text NOT NULL DEFAULT 'medium'
    CHECK (impact IN ('low', 'medium', 'high')),
  effort text NOT NULL DEFAULT 'medium'
    CHECK (effort IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'accepted', 'rejected', 'shipped')),
  url text,
  issue_id uuid REFERENCES ops.issues(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS ops.playbook_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'done', 'skipped')),
  notes text,
  assignee_id uuid,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ops_radar_status ON ops.radar_items(status, updated_at DESC);

ALTER TABLE ops.radar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.playbook_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ops radar" ON ops.radar_items;
CREATE POLICY "Admins manage ops radar"
  ON ops.radar_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage ops settings" ON ops.settings;
CREATE POLICY "Admins manage ops settings"
  ON ops.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage ops playbook runs" ON ops.playbook_runs;
CREATE POLICY "Admins manage ops playbook runs"
  ON ops.playbook_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON ops.radar_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ops.settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ops.playbook_runs TO authenticated;

INSERT INTO ops.settings (key, value) VALUES
  ('ecosystem_flags', '{"flywheel_cta_enabled": true, "sso_monitoring": true}'::jsonb),
  ('sso_baseline', '{"note": "Separate cookies per domain until SSO ships"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO ops.radar_items (title, summary, source, category, impact, effort, status)
SELECT v.title, v.summary, v.source, v.category, v.impact, v.effort, 'new'
FROM (VALUES
  ('SSO ข้ามโดเมน So1o ↔ an1hem', 'ลด drop-off เมื่อสลับแอป — ดู metrics ที่ Connections', 'ECOSYSTEM_ROADMAP', 'tech', 'high', 'high'),
  ('ปิดลูป Job → Portfolio', 'PostToAnthemBanner มีแล้ว — วัด conversion ใน Flywheel', 'tracking', 'product', 'high', 'medium'),
  ('Escrow marketplace', 'ชำระเงินลูกค้าผ่านแพลตฟอร์ม', 'ECOSYSTEM_ROADMAP', 'product', 'high', 'high'),
  ('Boost/โฆษณาผลงาน', 'tier-gated promotion บน an1hem', 'ECOSYSTEM_ROADMAP', 'market', 'medium', 'medium'),
  ('Supabase Pro monitoring', 'อัปเกรดเมื่อ usage ใกล้ limit — ดู /monitor', 'ops-infra-monitor', 'infra', 'medium', 'low')
) AS v(title, summary, source, category, impact, effort)
WHERE NOT EXISTS (SELECT 1 FROM ops.radar_items r WHERE r.title = v.title);

CREATE OR REPLACE FUNCTION public.trg_ecosystem_link_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_platform_event(
    'ecosystem.cross_link',
    NEW.user_id,
    'ecosystem_link',
    NEW.id::text,
    jsonb_build_object(
      'source_app', NEW.source_app,
      'source_page', NEW.source_page,
      'event_type', NEW.event_type
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ecosystem_links_event ON public.ecosystem_links;
CREATE TRIGGER trg_ecosystem_links_event
  AFTER INSERT ON public.ecosystem_links
  FOR EACH ROW EXECUTE FUNCTION public.trg_ecosystem_link_event();

CREATE OR REPLACE FUNCTION public.trg_ecosystem_link_converted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.meta ? 'converted_at' AND (OLD.meta IS NULL OR NOT (OLD.meta ? 'converted_at')) THEN
    PERFORM public.log_platform_event(
      'ecosystem.handoff_completed',
      NEW.user_id,
      'ecosystem_link',
      NEW.id::text,
      COALESCE(NEW.meta, '{}'::jsonb)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ecosystem_links_converted ON public.ecosystem_links;
CREATE TRIGGER trg_ecosystem_links_converted
  AFTER UPDATE OF meta ON public.ecosystem_links
  FOR EACH ROW EXECUTE FUNCTION public.trg_ecosystem_link_converted();

CREATE OR REPLACE FUNCTION public.trg_support_ticket_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_platform_event(
      'ticket.created',
      NEW.user_id,
      'support_ticket',
      NEW.id::text,
      jsonb_build_object('title', NEW.title, 'ticket_number', NEW.ticket_number)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_platform_event ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_platform_event
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.trg_support_ticket_event();

CREATE OR REPLACE FUNCTION public.admin_ecosystem_funnel(_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since_ts timestamptz := now() - make_interval(days => GREATEST(1, LEAST(_days, 90)));
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT jsonb_build_object(
    'days', _days,
    'since', since_ts,
    'flows', COALESCE((
      SELECT jsonb_agg(row ORDER BY row->>'id')
      FROM (
        SELECT jsonb_build_object(
          'id', f.flow_id,
          'label', f.flow_label,
          'direction', f.direction,
          'clicks', COUNT(*) FILTER (WHERE el.created_at >= since_ts),
          'converted', COUNT(*) FILTER (
            WHERE el.created_at >= since_ts AND el.meta ? 'converted_at'
          ),
          'stuck', COUNT(*) FILTER (
            WHERE el.created_at >= since_ts
              AND NOT (el.meta ? 'converted_at')
              AND el.created_at < now() - interval '48 hours'
          )
        ) AS row
        FROM public.ecosystem_links el
        CROSS JOIN LATERAL (
          SELECT
            CASE
              WHEN el.source_app = 'anthem' AND el.source_page ILIKE '%hire%' THEN 'anthem_hire_quotation'
              WHEN el.source_app = 'anthem' THEN 'anthem_to_so1o'
              WHEN el.source_app = 'so1o' AND el.source_page ILIKE '%post_anthem%' THEN 'so1o_job_portfolio'
              WHEN el.source_app = 'so1o' THEN 'so1o_to_anthem'
              ELSE 'other'
            END AS flow_id,
            CASE
              WHEN el.source_app = 'anthem' AND el.source_page ILIKE '%hire%' THEN 'an1hem จ้าง → So1o ใบเสนอราคา'
              WHEN el.source_app = 'anthem' THEN 'an1hem → So1o'
              WHEN el.source_app = 'so1o' AND el.source_page ILIKE '%post_anthem%' THEN 'So1o งานเสร็จ → an1hem โพสต์'
              WHEN el.source_app = 'so1o' THEN 'So1o → an1hem'
              ELSE 'อื่นๆ'
            END AS flow_label,
            CASE
              WHEN el.source_app = 'anthem' THEN 'anthem_to_so1o'
              WHEN el.source_app = 'so1o' THEN 'so1o_to_anthem'
              ELSE 'other'
            END AS direction
        ) f
        WHERE el.event_type = 'cross_link_click'
        GROUP BY f.flow_id, f.flow_label, f.direction
      ) sub
    ), '[]'::jsonb),
    'totals', jsonb_build_object(
      'clicks_24h', (SELECT COUNT(*) FROM public.ecosystem_links WHERE created_at >= now() - interval '24 hours'),
      'clicks_7d', (SELECT COUNT(*) FROM public.ecosystem_links WHERE created_at >= now() - interval '7 days'),
      'converted_7d', (
        SELECT COUNT(*) FROM public.ecosystem_links
        WHERE created_at >= now() - interval '7 days' AND meta ? 'converted_at'
      ),
      'stuck_48h', (
        SELECT COUNT(*) FROM public.ecosystem_links
        WHERE created_at < now() - interval '48 hours'
          AND created_at >= now() - interval '30 days'
          AND NOT (meta ? 'converted_at')
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_sso_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
DECLARE
  dual_users bigint;
  pro_dual bigint;
  anthem_only bigint;
  so1o_only bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT COUNT(DISTINCT p.user_id) INTO dual_users
  FROM public.profiles p
  WHERE EXISTS (SELECT 1 FROM public.quotations q WHERE q.user_id = p.user_id)
    AND EXISTS (SELECT 1 FROM anthem.projects pr WHERE pr.user_id = p.user_id);

  SELECT COUNT(DISTINCT p.user_id) INTO pro_dual
  FROM public.profiles p
  WHERE p.subscription_tier IN ('pro', 'pro_plus')
    AND EXISTS (SELECT 1 FROM public.quotations q WHERE q.user_id = p.user_id)
    AND EXISTS (SELECT 1 FROM anthem.projects pr WHERE pr.user_id = p.user_id);

  SELECT COUNT(*) INTO anthem_only
  FROM public.profiles p
  WHERE EXISTS (SELECT 1 FROM anthem.projects pr WHERE pr.user_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.quotations q WHERE q.user_id = p.user_id);

  SELECT COUNT(*) INTO so1o_only
  FROM public.profiles p
  WHERE EXISTS (SELECT 1 FROM public.quotations q WHERE q.user_id = p.user_id)
    AND NOT EXISTS (SELECT 1 FROM anthem.projects pr WHERE pr.user_id = p.user_id);

  RETURN jsonb_build_object(
    'dual_app_users', dual_users,
    'pro_dual_app_users', pro_dual,
    'anthem_only_users', anthem_only,
    'so1o_only_users', so1o_only,
    'sso_status', 'deferred',
    'note', 'คนละโดเมน = คนละ cookie จนกว่า SSO จะ ship'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_user_360(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, anthem, shared
AS $$
DECLARE
  prof record;
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT user_id, display_name, username, subscription_tier, created_at
    INTO prof
    FROM public.profiles
   WHERE user_id = _user_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'profile', jsonb_build_object(
      'user_id', prof.user_id,
      'display_name', prof.display_name,
      'username', prof.username,
      'subscription_tier', prof.subscription_tier,
      'created_at', prof.created_at
    ),
    'so1o', jsonb_build_object(
      'quotations', (SELECT COUNT(*) FROM public.quotations WHERE user_id = _user_id),
      'open_tickets', (
        SELECT COUNT(*) FROM public.support_tickets
        WHERE user_id = _user_id AND status IN ('new', 'in_progress', 'qa')
      )
    ),
    'an1hem', jsonb_build_object(
      'projects', (SELECT COUNT(*) FROM anthem.projects WHERE user_id = _user_id),
      'published', (
        SELECT COUNT(*) FROM anthem.projects WHERE user_id = _user_id AND status = 'Published'
      ),
      'feedback', (SELECT COUNT(*) FROM anthem.app_feedback WHERE user_id = _user_id)
    ),
    'ecosystem', jsonb_build_object(
      'cross_links', (SELECT COUNT(*) FROM public.ecosystem_links WHERE user_id = _user_id),
      'converted_links', (
        SELECT COUNT(*) FROM public.ecosystem_links
        WHERE user_id = _user_id AND meta ? 'converted_at'
      )
    ),
    'recent_links', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', el.id,
        'source_app', el.source_app,
        'source_page', el.source_page,
        'created_at', el.created_at,
        'converted', el.meta ? 'converted_at'
      ) ORDER BY el.created_at DESC)
      FROM (
        SELECT * FROM public.ecosystem_links
        WHERE user_id = _user_id
        ORDER BY created_at DESC
        LIMIT 10
      ) el
    ), '[]'::jsonb),
    'recent_events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'event_type', pe.event_type,
        'created_at', pe.created_at,
        'target_type', pe.target_type
      ) ORDER BY pe.created_at DESC)
      FROM (
        SELECT * FROM public.platform_events
        WHERE actor_id = _user_id
        ORDER BY created_at DESC
        LIMIT 15
      ) pe
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_search_users(_query text, _limit integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  username text,
  subscription_tier text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim integer := GREATEST(5, LEAST(COALESCE(_limit, 20), 50));
  q text := trim(COALESCE(_query, ''));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.display_name, p.username, p.subscription_tier, p.created_at
  FROM public.profiles p
  WHERE q = ''
     OR p.display_name ILIKE '%' || q || '%'
     OR p.username ILIKE '%' || q || '%'
     OR p.user_id::text ILIKE q || '%'
  ORDER BY p.created_at DESC
  LIMIT lim;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_platform_events(_limit integer DEFAULT 50)
RETURNS SETOF public.platform_events
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  RETURN QUERY
  SELECT * FROM public.platform_events
  ORDER BY created_at DESC
  LIMIT GREATEST(10, LEAST(COALESCE(_limit, 50), 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_ecosystem_funnel(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sso_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_360(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_users(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_platform_events(integer) TO authenticated;
