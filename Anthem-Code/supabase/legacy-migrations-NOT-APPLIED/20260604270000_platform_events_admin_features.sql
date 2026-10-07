-- Platform events log, admin alerts, analytics RPCs, wallet ledger & applications helpers

-- ─── platform_events ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.platform_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,
  actor_id    uuid,
  target_type text,
  target_id   uuid,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_events_created_at_idx ON public.platform_events (created_at DESC);
CREATE INDEX IF NOT EXISTS platform_events_type_idx ON public.platform_events (event_type);
CREATE INDEX IF NOT EXISTS platform_events_actor_idx ON public.platform_events (actor_id) WHERE actor_id IS NOT NULL;

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin reads platform_events" ON public.platform_events;
CREATE POLICY "admin reads platform_events"
  ON public.platform_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.platform_events TO authenticated;
GRANT ALL ON public.platform_events TO service_role;

-- ─── Generic event logger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._log_platform_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type text := TG_ARGV[0];
  v_actor uuid;
  v_target_type text := NULLIF(TG_ARGV[1], '');
  v_target_id uuid;
  v_meta jsonb := '{}'::jsonb;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'profiles' THEN
      v_actor := NEW.id;
      v_meta := jsonb_build_object('display_name', NEW.display_name, 'username', NEW.username);
    WHEN 'projects' THEN
      v_actor := NEW.owner_id; v_target_type := 'project'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('title', NEW.title, 'status', NEW.status);
    WHEN 'project_likes' THEN
      v_actor := NEW.user_id; v_target_type := 'project'; v_target_id := NEW.project_id;
    WHEN 'project_comments' THEN
      v_actor := NEW.user_id; v_target_type := 'project'; v_target_id := NEW.project_id;
      v_meta := jsonb_build_object('content', left(NEW.content, 200));
    WHEN 'follows' THEN
      v_actor := NEW.follower_id; v_target_type := 'user'; v_target_id := NEW.following_id;
    WHEN 'hiring_requests' THEN
      v_actor := NEW.client_id; v_target_type := 'project';
      BEGIN
        v_target_id := NULLIF(NEW.project_id::text, '')::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_target_id := NULL;
      END;
      v_meta := jsonb_build_object('project_title', NEW.project_title, 'client_name', NEW.client_name, 'status', NEW.status, 'project_ref', NEW.project_id);
    WHEN 'collab_requests' THEN
      v_actor := NEW.sender_id; v_target_type := 'user'; v_target_id := NEW.recipient_id;
      v_meta := jsonb_build_object('message', left(NEW.message, 200), 'status', NEW.status);
    WHEN 'job_posts' THEN
      v_actor := NEW.posted_by; v_target_type := 'job'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('title', NEW.title, 'status', NEW.status);
    WHEN 'job_applications' THEN
      v_actor := NEW.applicant_id; v_target_type := 'job'; v_target_id := NEW.job_id;
      v_meta := jsonb_build_object('status', NEW.status);
    WHEN 'gift_transactions' THEN
      v_actor := NEW.sender_id; v_target_type := 'user'; v_target_id := NEW.recipient_id;
      v_meta := jsonb_build_object('price_px', NEW.price_px, 'gift_id', NEW.gift_id, 'project_id', NEW.project_id);
    WHEN 'user_reports' THEN
      v_actor := NEW.reporter_id; v_target_type := NEW.target_type; v_target_id := NEW.target_id;
      v_meta := jsonb_build_object('reason', NEW.reason, 'status', NEW.status);
    WHEN 'app_feedback' THEN
      v_actor := NEW.user_id; v_target_type := 'feedback'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('feature', NEW.feature, 'rating', NEW.rating, 'status', NEW.status);
    WHEN 'cashout_requests' THEN
      v_actor := NEW.user_id; v_target_type := 'cashout'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('gross_px', NEW.gross_px, 'status', NEW.status);
    WHEN 'kyc_requests' THEN
      v_actor := NEW.user_id; v_target_type := 'kyc'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('status', NEW.status);
    WHEN 'aml_flags' THEN
      v_actor := NEW.user_id; v_target_type := 'aml'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('flag_type', NEW.flag_type, 'severity', NEW.severity, 'status', NEW.status);
    WHEN 'messages' THEN
      v_actor := NEW.sender_id; v_target_type := 'conversation'; v_target_id := NEW.conversation_id;
      v_meta := jsonb_build_object('content', left(NEW.content, 120));
    WHEN 'collections' THEN
      v_actor := NEW.user_id; v_target_type := 'collection'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('name', NEW.name);
    WHEN 'contracts' THEN
      v_actor := NEW.user_id; v_target_type := 'contract'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('title', NEW.title, 'type', NEW.type, 'status', NEW.status);
    WHEN 'studios' THEN
      v_actor := NEW.owner_id; v_target_type := 'studio'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('name', NEW.name, 'slug', NEW.slug);
    ELSE
      v_meta := to_jsonb(NEW);
  END CASE;

  INSERT INTO public.platform_events(event_type, actor_id, target_type, target_id, metadata)
  VALUES (v_type, v_actor, v_target_type, v_target_id, v_meta);
  RETURN NEW;
END;
$$;

-- Attach triggers (idempotent)
DROP TRIGGER IF EXISTS trg_platform_event_profiles ON public.profiles;
CREATE TRIGGER trg_platform_event_profiles AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('user.signup', '');
DROP TRIGGER IF EXISTS trg_platform_event_projects ON public.projects;
CREATE TRIGGER trg_platform_event_projects AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('project.created', '');
DROP TRIGGER IF EXISTS trg_platform_event_project_likes ON public.project_likes;
CREATE TRIGGER trg_platform_event_project_likes AFTER INSERT ON public.project_likes FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('project.like', '');
DROP TRIGGER IF EXISTS trg_platform_event_project_comments ON public.project_comments;
CREATE TRIGGER trg_platform_event_project_comments AFTER INSERT ON public.project_comments FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('project.comment', '');
DROP TRIGGER IF EXISTS trg_platform_event_follows ON public.follows;
CREATE TRIGGER trg_platform_event_follows AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('user.follow', '');
DROP TRIGGER IF EXISTS trg_platform_event_hiring_requests ON public.hiring_requests;
CREATE TRIGGER trg_platform_event_hiring_requests AFTER INSERT ON public.hiring_requests FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('hire.request', '');
DROP TRIGGER IF EXISTS trg_platform_event_collab_requests ON public.collab_requests;
CREATE TRIGGER trg_platform_event_collab_requests AFTER INSERT ON public.collab_requests FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('collab.request', '');
DROP TRIGGER IF EXISTS trg_platform_event_job_posts ON public.job_posts;
CREATE TRIGGER trg_platform_event_job_posts AFTER INSERT ON public.job_posts FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('job.posted', '');
DROP TRIGGER IF EXISTS trg_platform_event_job_applications ON public.job_applications;
CREATE TRIGGER trg_platform_event_job_applications AFTER INSERT ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('job.application', '');
DROP TRIGGER IF EXISTS trg_platform_event_gift_transactions ON public.gift_transactions;
CREATE TRIGGER trg_platform_event_gift_transactions AFTER INSERT ON public.gift_transactions FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('gift.sent', '');
DROP TRIGGER IF EXISTS trg_platform_event_user_reports ON public.user_reports;
CREATE TRIGGER trg_platform_event_user_reports AFTER INSERT ON public.user_reports FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('report.created', '');
DROP TRIGGER IF EXISTS trg_platform_event_app_feedback ON public.app_feedback;
CREATE TRIGGER trg_platform_event_app_feedback AFTER INSERT ON public.app_feedback FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('feedback.created', '');
DROP TRIGGER IF EXISTS trg_platform_event_cashout_requests ON public.cashout_requests;
CREATE TRIGGER trg_platform_event_cashout_requests AFTER INSERT ON public.cashout_requests FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('cashout.requested', '');
DROP TRIGGER IF EXISTS trg_platform_event_kyc_requests ON public.kyc_requests;
CREATE TRIGGER trg_platform_event_kyc_requests AFTER INSERT ON public.kyc_requests FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('kyc.submitted', '');
DROP TRIGGER IF EXISTS trg_platform_event_aml_flags ON public.aml_flags;
CREATE TRIGGER trg_platform_event_aml_flags AFTER INSERT ON public.aml_flags FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('aml.flagged', '');
DROP TRIGGER IF EXISTS trg_platform_event_messages ON public.messages;
CREATE TRIGGER trg_platform_event_messages AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('chat.message', '');
DROP TRIGGER IF EXISTS trg_platform_event_collections ON public.collections;
CREATE TRIGGER trg_platform_event_collections AFTER INSERT ON public.collections FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('collection.created', '');
DROP TRIGGER IF EXISTS trg_platform_event_contracts ON public.contracts;
CREATE TRIGGER trg_platform_event_contracts AFTER INSERT ON public.contracts FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('contract.created', '');
DROP TRIGGER IF EXISTS trg_platform_event_studios ON public.studios;
CREATE TRIGGER trg_platform_event_studios AFTER INSERT ON public.studios FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('studio.created', '');

-- ─── Admin notifications on report / cashout ─────────────────────────────────
CREATE OR REPLACE FUNCTION public._notify_all_admins(
  _kind text, _title text, _body text, _link text, _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = shared, public
AS $$
DECLARE
  admin_uid uuid;
BEGIN
  FOR admin_uid IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'::app_role
  LOOP
    INSERT INTO shared.notifications(user_id, app, kind, title, body, link, metadata)
    VALUES (admin_uid, 'anthem', _kind, _title, COALESCE(_body, ''), COALESCE(_link, ''), COALESCE(_metadata, '{}'::jsonb));
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._trg_admin_alert_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._notify_all_admins(
    'admin_report',
    'รายงานเนื้อหาใหม่',
    format('เหตุผล: %s (%s)', NEW.reason, NEW.target_type),
    '/admin/reports',
    jsonb_build_object('report_id', NEW.id, 'target_type', NEW.target_type, 'target_id', NEW.target_id)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._trg_admin_alert_cashout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM public._notify_all_admins(
      'admin_cashout',
      'คำขอถอนเงินใหม่',
      format('฿%s PX รอดำเนินการ', NEW.gross_px),
      '/admin/wallet',
      jsonb_build_object('cashout_id', NEW.id, 'user_id', NEW.user_id, 'gross_px', NEW.gross_px)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_alert_report ON public.user_reports;
CREATE TRIGGER trg_admin_alert_report
  AFTER INSERT ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public._trg_admin_alert_report();

DROP TRIGGER IF EXISTS trg_admin_alert_cashout ON public.cashout_requests;
CREATE TRIGGER trg_admin_alert_cashout
  AFTER INSERT ON public.cashout_requests
  FOR EACH ROW EXECUTE FUNCTION public._trg_admin_alert_cashout();

-- Realtime for platform_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_events;
ALTER TABLE public.platform_events REPLICA IDENTITY FULL;

-- ─── RPC: list platform events ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_list_platform_events(
  _limit int DEFAULT 120,
  _event_type text DEFAULT NULL
)
RETURNS SETOF public.platform_events
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT *
  FROM public.platform_events e
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND (_event_type IS NULL OR e.event_type = _event_type)
  ORDER BY e.created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 500));
$$;

-- ─── RPC: job applications (admin) ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_list_applications(_limit int DEFAULT 200)
RETURNS TABLE(
  id uuid, job_id uuid, job_title text, applicant_id uuid, applicant_name text,
  status text, cover_letter text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT a.id, a.job_id, j.title, a.applicant_id, p.display_name,
           a.status::text, left(a.cover_letter, 300), a.created_at
    FROM public.job_applications a
    JOIN public.job_posts j ON j.id = a.job_id
    LEFT JOIN public.profiles p ON p.id = a.applicant_id
    ORDER BY a.created_at DESC
    LIMIT _limit;
END;
$$;

-- ─── RPC: wallet ledger (unified) ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_wallet_ledger(_limit int DEFAULT 200)
RETURNS TABLE(
  id uuid, created_at timestamptz, entry_type text, user_id uuid, user_name text,
  amount_px int, direction text, status text, note text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT * FROM (
      SELECT t.id, t.created_at, 'topup'::text, t.user_id, p.display_name,
             t.amount_px, 'in'::text, t.status, t.method
      FROM public.wallet_topups t
      LEFT JOIN public.profiles p ON p.id = t.user_id
      UNION ALL
      SELECT g.id, g.created_at, 'gift'::text, g.sender_id, sp.display_name,
             g.price_px, 'out'::text, 'completed'::text, 'gift to ' || COALESCE(rp.display_name, g.recipient_id::text)
      FROM public.gift_transactions g
      LEFT JOIN public.profiles sp ON sp.id = g.sender_id
      LEFT JOIN public.profiles rp ON rp.id = g.recipient_id
      UNION ALL
      SELECT c.id, c.created_at, 'cashout'::text, c.user_id, p.display_name,
             c.gross_px, 'out'::text, c.status, 'net ' || c.net_px::text
      FROM public.cashout_requests c
      LEFT JOIN public.profiles p ON p.id = c.user_id
    ) ledger
    ORDER BY created_at DESC
    LIMIT _limit;
END;
$$;

-- ─── RPC: analytics overview ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_analytics_overview(_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_start timestamptz := now() - make_interval(days => _days);
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT jsonb_build_object(
    'signups', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('date', d::date, 'count', cnt) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', created_at) AS d, COUNT(*)::int AS cnt
        FROM public.profiles WHERE created_at >= v_start
        GROUP BY 1
      ) s
    ),
    'engagement', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'date', d::date,
        'likes', COALESCE(lk, 0),
        'comments', COALESCE(cm, 0),
        'views', COALESCE(vw, 0)
      ) ORDER BY d), '[]'::jsonb)
      FROM (
        SELECT date_trunc('day', gs)::timestamptz AS d
        FROM generate_series(v_start::date, now()::date, '1 day') gs
      ) days
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS lk FROM public.project_likes
        WHERE created_at >= days.d AND created_at < days.d + interval '1 day'
      ) l ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cm FROM public.project_comments
        WHERE created_at >= days.d AND created_at < days.d + interval '1 day'
      ) c ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS vw FROM public.project_views
        WHERE viewed_at >= days.d AND viewed_at < days.d + interval '1 day'
      ) v ON true
    ),
    'funnel', jsonb_build_object(
      'hiring_requests', (SELECT COUNT(*)::int FROM public.hiring_requests WHERE created_at >= v_start),
      'collab_requests', (SELECT COUNT(*)::int FROM public.collab_requests WHERE created_at >= v_start),
      'job_posts', (SELECT COUNT(*)::int FROM public.job_posts WHERE created_at >= v_start),
      'job_applications', (SELECT COUNT(*)::int FROM public.job_applications WHERE created_at >= v_start),
      'contracts', (SELECT COUNT(*)::int FROM public.contracts WHERE created_at >= v_start),
      'pending_hires', (SELECT COUNT(*)::int FROM public.hiring_requests WHERE status = 'ใหม่'),
      'pending_apps', (SELECT COUNT(*)::int FROM public.job_applications WHERE status = 'pending')
    ),
    'revenue', jsonb_build_object(
      'gifts_px', COALESCE((SELECT SUM(price_px)::int FROM public.gift_transactions WHERE created_at >= v_start), 0),
      'topups_px', COALESCE((SELECT SUM(amount_px)::int FROM public.wallet_topups WHERE created_at >= v_start AND status = 'completed'), 0),
      'cashouts_px', COALESCE((SELECT SUM(gross_px)::int FROM public.cashout_requests WHERE created_at >= v_start), 0)
    ),
    'retention', jsonb_build_object(
      'active_7d', (SELECT COUNT(DISTINCT user_id)::int FROM public.project_likes WHERE created_at >= now() - interval '7 days'),
      'active_30d', (SELECT COUNT(DISTINCT user_id)::int FROM public.project_likes WHERE created_at >= now() - interval '30 days'),
      'returning_users', (
        SELECT COUNT(DISTINCT p.id)::int FROM public.profiles p
        WHERE p.created_at < now() - interval '7 days'
          AND EXISTS (
            SELECT 1 FROM public.project_likes pl
            WHERE pl.user_id = p.id AND pl.created_at >= now() - interval '7 days'
          )
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_platform_events(int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_applications(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_wallet_ledger(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_overview(int) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_list_platform_events(int, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_applications(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_wallet_ledger(int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_analytics_overview(int) FROM PUBLIC, anon;
