-- Aplus1 product event stream + admin raw data export hub
-- Fixes platform_events triggers for anthem/shared schemas
-- Recreates admin_analytics_overview against anthem + shared

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

-- Product events (client-side first-party analytics; consent-gated in app)
CREATE TABLE IF NOT EXISTS public.product_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app         text NOT NULL DEFAULT 'aplus1',
  event_name  text NOT NULL,
  user_id     uuid,
  session_id  text NOT NULL,
  path        text,
  referrer    text,
  props       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_events_session_len CHECK (char_length(session_id) BETWEEN 8 AND 128),
  CONSTRAINT product_events_name_len CHECK (char_length(event_name) BETWEEN 2 AND 64),
  CONSTRAINT product_events_app_len CHECK (char_length(app) BETWEEN 2 AND 32)
);

CREATE INDEX IF NOT EXISTS product_events_created_at_idx ON public.product_events (created_at DESC);
CREATE INDEX IF NOT EXISTS product_events_name_idx ON public.product_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS product_events_user_idx ON public.product_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS product_events_session_idx ON public.product_events (session_id, created_at DESC);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin reads product_events" ON public.product_events;
CREATE POLICY "admin reads product_events"
  ON public.product_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No direct INSERT from clients — use log_product_event RPC
REVOKE INSERT, UPDATE, DELETE ON public.product_events FROM anon, authenticated;
GRANT SELECT ON public.product_events TO authenticated;
GRANT ALL ON public.product_events TO service_role;

CREATE OR REPLACE FUNCTION public.log_product_event(
  _event_name text,
  _session_id text,
  _path text DEFAULT NULL,
  _referrer text DEFAULT NULL,
  _props jsonb DEFAULT '{}'::jsonb,
  _app text DEFAULT 'aplus1'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_name text := lower(trim(COALESCE(_event_name, '')));
  v_session text := trim(COALESCE(_session_id, ''));
  v_props jsonb := COALESCE(_props, '{}'::jsonb);
  v_allowed text[] := ARRAY[
    'page_view','project_view','profile_view','feed_search',
    'hire_open','hire_submit','collab_open','collab_submit',
    'job_apply','follow_click','share_click','cta_ecosystem',
    'collection_save','inspire_click','ad_click','ad_impression'
  ];
BEGIN
  IF v_session IS NULL OR char_length(v_session) < 8 OR char_length(v_session) > 128 THEN
    RAISE EXCEPTION 'invalid session';
  END IF;
  IF v_name IS NULL OR NOT (v_name = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'invalid event';
  END IF;
  IF jsonb_typeof(v_props) <> 'object' THEN
    RAISE EXCEPTION 'invalid props';
  END IF;
  IF octet_length(v_props::text) > 4000 THEN
    RAISE EXCEPTION 'props too large';
  END IF;

  -- Soft rate limit: max 120 rows / session / minute
  IF (
    SELECT COUNT(*) FROM public.product_events pe
    WHERE pe.session_id = v_session AND pe.created_at > now() - interval '1 minute'
  ) >= 120 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.product_events (app, event_name, user_id, session_id, path, referrer, props)
  VALUES (
    COALESCE(NULLIF(trim(_app), ''), 'aplus1'),
    v_name,
    auth.uid(),
    v_session,
    NULLIF(left(COALESCE(_path, ''), 500), ''),
    NULLIF(left(COALESCE(_referrer, ''), 500), ''),
    v_props
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_product_event(text, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_product_event(text, text, text, text, jsonb, text) TO anon, authenticated;

-- Platform event logger (anthem + shared aware)
CREATE OR REPLACE FUNCTION public._log_platform_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem, shared
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
      v_actor := COALESCE(NEW.user_id, NEW.id);
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
      v_meta := jsonb_build_object('message', left(COALESCE(NEW.message, ''), 200), 'status', NEW.status);
    WHEN 'job_posts' THEN
      v_actor := NEW.posted_by; v_target_type := 'job'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('title', NEW.title, 'status', NEW.status);
    WHEN 'job_applications' THEN
      v_actor := NEW.applicant_id; v_target_type := 'job'; v_target_id := NEW.job_id;
      v_meta := jsonb_build_object('status', NEW.status);
    WHEN 'gift_transactions' THEN
      v_actor := NEW.sender_id; v_target_type := 'user'; v_target_id := NEW.recipient_id;
      v_meta := jsonb_build_object('price_px', NEW.price_px, 'gift_id', NEW.gift_id, 'project_id', NEW.project_id);
    WHEN 'app_feedback' THEN
      v_actor := NEW.user_id; v_target_type := 'feedback'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('feature', NEW.feature, 'rating', NEW.rating, 'status', NEW.status);
    WHEN 'cashout_requests' THEN
      v_actor := NEW.user_id; v_target_type := 'cashout'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('gross_px', NEW.gross_px, 'status', NEW.status);
    WHEN 'kyc_requests' THEN
      v_actor := NEW.user_id; v_target_type := 'kyc'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('status', NEW.status);
    WHEN 'messages' THEN
      v_actor := NEW.sender_id; v_target_type := 'conversation'; v_target_id := NEW.conversation_id;
      v_meta := jsonb_build_object('content', left(COALESCE(NEW.content, ''), 120));
    WHEN 'collections' THEN
      v_actor := NEW.user_id; v_target_type := 'collection'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('name', NEW.name);
    WHEN 'studios' THEN
      v_actor := NEW.owner_id; v_target_type := 'studio'; v_target_id := NEW.id;
      v_meta := jsonb_build_object('name', NEW.name, 'slug', NEW.slug);
    ELSE
      v_meta := '{}'::jsonb;
  END CASE;

  INSERT INTO public.platform_events(event_type, actor_id, target_type, target_id, metadata)
  VALUES (v_type, v_actor, v_target_type, v_target_id, v_meta);
  RETURN NEW;
END;
$$;

-- Attach triggers on anthem / shared / public (idempotent)
DO $$
BEGIN
  -- public.profiles
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_profiles ON public.profiles;
    CREATE TRIGGER trg_platform_event_profiles AFTER INSERT ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('user.signup', '');
  END IF;

  IF to_regclass('anthem.projects') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_projects ON anthem.projects;
    CREATE TRIGGER trg_platform_event_projects AFTER INSERT ON anthem.projects
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('project.created', '');
  END IF;

  IF to_regclass('anthem.project_likes') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_project_likes ON anthem.project_likes;
    CREATE TRIGGER trg_platform_event_project_likes AFTER INSERT ON anthem.project_likes
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('project.like', '');
  END IF;

  IF to_regclass('anthem.project_comments') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_project_comments ON anthem.project_comments;
    CREATE TRIGGER trg_platform_event_project_comments AFTER INSERT ON anthem.project_comments
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('project.comment', '');
  END IF;

  IF to_regclass('anthem.follows') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_follows ON anthem.follows;
    CREATE TRIGGER trg_platform_event_follows AFTER INSERT ON anthem.follows
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('user.follow', '');
  END IF;

  IF to_regclass('anthem.hiring_requests') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_hiring_requests ON anthem.hiring_requests;
    CREATE TRIGGER trg_platform_event_hiring_requests AFTER INSERT ON anthem.hiring_requests
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('hire.request', '');
  END IF;

  IF to_regclass('anthem.collab_requests') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_collab_requests ON anthem.collab_requests;
    CREATE TRIGGER trg_platform_event_collab_requests AFTER INSERT ON anthem.collab_requests
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('collab.request', '');
  END IF;

  IF to_regclass('anthem.job_posts') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_job_posts ON anthem.job_posts;
    CREATE TRIGGER trg_platform_event_job_posts AFTER INSERT ON anthem.job_posts
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('job.posted', '');
  END IF;

  IF to_regclass('anthem.job_applications') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_job_applications ON anthem.job_applications;
    CREATE TRIGGER trg_platform_event_job_applications AFTER INSERT ON anthem.job_applications
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('job.application', '');
  END IF;

  IF to_regclass('anthem.app_feedback') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_app_feedback ON anthem.app_feedback;
    CREATE TRIGGER trg_platform_event_app_feedback AFTER INSERT ON anthem.app_feedback
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('feedback.created', '');
  END IF;

  IF to_regclass('anthem.collections') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_collections ON anthem.collections;
    CREATE TRIGGER trg_platform_event_collections AFTER INSERT ON anthem.collections
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('collection.created', '');
  END IF;

  IF to_regclass('anthem.studios') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_studios ON anthem.studios;
    CREATE TRIGGER trg_platform_event_studios AFTER INSERT ON anthem.studios
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('studio.created', '');
  END IF;

  IF to_regclass('shared.gift_transactions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_gift_transactions ON shared.gift_transactions;
    CREATE TRIGGER trg_platform_event_gift_transactions AFTER INSERT ON shared.gift_transactions
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('gift.sent', '');
  END IF;

  IF to_regclass('shared.cashout_requests') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_cashout_requests ON shared.cashout_requests;
    CREATE TRIGGER trg_platform_event_cashout_requests AFTER INSERT ON shared.cashout_requests
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('cashout.requested', '');
  END IF;

  IF to_regclass('shared.kyc_requests') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_kyc_requests ON shared.kyc_requests;
    CREATE TRIGGER trg_platform_event_kyc_requests AFTER INSERT ON shared.kyc_requests
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('kyc.submitted', '');
  END IF;

  IF to_regclass('shared.messages') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_platform_event_messages ON shared.messages;
    CREATE TRIGGER trg_platform_event_messages AFTER INSERT ON shared.messages
      FOR EACH ROW EXECUTE FUNCTION public._log_platform_event('chat.message', '');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_platform_events(_limit integer DEFAULT 50)
RETURNS SETOF public.platform_events
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  RETURN QUERY
  SELECT * FROM public.platform_events
  ORDER BY created_at DESC
  LIMIT GREATEST(10, LEAST(COALESCE(_limit, 50), 500));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_platform_events(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_platform_events(integer) TO authenticated;

-- Analytics overview (anthem + shared)
CREATE OR REPLACE FUNCTION public.admin_analytics_overview(_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, anthem, shared
AS $$
DECLARE
  v_start timestamptz := now() - make_interval(days => GREATEST(1, LEAST(COALESCE(_days, 30), 365)));
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
        SELECT COUNT(*)::int AS lk FROM anthem.project_likes
        WHERE created_at >= days.d AND created_at < days.d + interval '1 day'
      ) l ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cm FROM anthem.project_comments
        WHERE created_at >= days.d AND created_at < days.d + interval '1 day'
      ) c ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS vw FROM anthem.project_views
        WHERE viewed_at >= days.d AND viewed_at < days.d + interval '1 day'
      ) v ON true
    ),
    'funnel', jsonb_build_object(
      'hiring_requests', (SELECT COUNT(*)::int FROM anthem.hiring_requests WHERE created_at >= v_start),
      'collab_requests', (SELECT COUNT(*)::int FROM anthem.collab_requests WHERE created_at >= v_start),
      'job_posts', (SELECT COUNT(*)::int FROM anthem.job_posts WHERE created_at >= v_start),
      'job_applications', (SELECT COUNT(*)::int FROM anthem.job_applications WHERE created_at >= v_start),
      'contracts', 0,
      'pending_hires', (SELECT COUNT(*)::int FROM anthem.hiring_requests WHERE status::text = 'ใหม่'),
      'pending_apps', (SELECT COUNT(*)::int FROM anthem.job_applications WHERE status::text = 'pending')
    ),
    'revenue', jsonb_build_object(
      'gifts_px', COALESCE((SELECT SUM(price_px)::int FROM shared.gift_transactions WHERE created_at >= v_start), 0),
      'topups_px', COALESCE((SELECT SUM(amount_px)::int FROM shared.wallet_topups WHERE created_at >= v_start AND status::text = 'completed'), 0),
      'cashouts_px', COALESCE((SELECT SUM(gross_px)::int FROM shared.cashout_requests WHERE created_at >= v_start), 0)
    ),
    'retention', jsonb_build_object(
      'active_7d', (SELECT COUNT(DISTINCT user_id)::int FROM anthem.project_likes WHERE created_at >= now() - interval '7 days'),
      'active_30d', (SELECT COUNT(DISTINCT user_id)::int FROM anthem.project_likes WHERE created_at >= now() - interval '30 days'),
      'returning_users', (
        SELECT COUNT(DISTINCT p.user_id)::int FROM public.profiles p
        WHERE p.created_at < now() - interval '7 days'
          AND EXISTS (
            SELECT 1 FROM anthem.project_likes pl
            WHERE pl.user_id = p.user_id AND pl.created_at >= now() - interval '7 days'
          )
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_analytics_overview(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_analytics_overview(int) TO authenticated;

-- Admin raw export packs
CREATE OR REPLACE FUNCTION public.admin_export_data_pack(
  _days int DEFAULT 30,
  _pack text DEFAULT 'full',
  _limit int DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, anthem, shared
AS $$
DECLARE
  v_days int := GREATEST(1, LEAST(COALESCE(_days, 30), 365));
  v_limit int := GREATEST(100, LEAST(COALESCE(_limit, 5000), 20000));
  v_start timestamptz := now() - make_interval(days => v_days);
  v_pack text := lower(COALESCE(NULLIF(trim(_pack), ''), 'full'));
  v_out jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_pack NOT IN ('full', 'growth', 'opportunity', 'engagement', 'events', 'marketing') THEN
    RAISE EXCEPTION 'invalid pack';
  END IF;

  v_out := jsonb_build_object(
    'generated_at', now(),
    'days', v_days,
    'pack', v_pack,
    'row_limit', v_limit
  );

  IF v_pack IN ('full', 'growth', 'marketing') THEN
    v_out := v_out || jsonb_build_object(
      'users', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT user_id, username, display_name, email, role, created_at, updated_at
          FROM public.profiles
          WHERE created_at >= v_start OR updated_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb)
    );
  END IF;

  IF v_pack IN ('full', 'growth', 'engagement') THEN
    v_out := v_out || jsonb_build_object(
      'projects', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT id, owner_id, title, category, status, views, likes, allow_hire, allow_collab, studio_id, created_at, updated_at
          FROM anthem.projects
          WHERE created_at >= v_start OR updated_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb),
      'project_views', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT user_id, project_id, viewed_at
          FROM anthem.project_views
          WHERE viewed_at >= v_start
          ORDER BY viewed_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb)
    );
  END IF;

  IF v_pack IN ('full', 'opportunity', 'marketing') THEN
    v_out := v_out || jsonb_build_object(
      'hiring_requests', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT id, freelancer_id, client_id, project_id, project_title, client_name, email, budget, budget_amount, status, created_at
          FROM anthem.hiring_requests
          WHERE created_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb),
      'collab_requests', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT id, sender_id, recipient_id, message, status, created_at
          FROM anthem.collab_requests
          WHERE created_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb),
      'job_posts', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT id, posted_by, title, status, created_at, updated_at
          FROM anthem.job_posts
          WHERE created_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb),
      'job_applications', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT id, job_id, applicant_id, status, created_at
          FROM anthem.job_applications
          WHERE created_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb)
    );
  END IF;

  IF v_pack IN ('full', 'engagement') THEN
    v_out := v_out || jsonb_build_object(
      'likes', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT user_id, project_id, created_at
          FROM anthem.project_likes
          WHERE created_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb),
      'comments', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT id, user_id, project_id, left(content, 300) AS content, created_at
          FROM anthem.project_comments
          WHERE created_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb),
      'follows', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT follower_id, following_id, created_at
          FROM anthem.follows
          WHERE created_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb)
    );
  END IF;

  IF v_pack IN ('full', 'events', 'growth') THEN
    v_out := v_out || jsonb_build_object(
      'product_events', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT id, app, event_name, user_id, session_id, path, referrer, props, created_at
          FROM public.product_events
          WHERE created_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb),
      'platform_events', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT id, event_type, actor_id, target_type, target_id, metadata, created_at
          FROM public.platform_events
          WHERE created_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb)
    );
  END IF;

  IF v_pack IN ('full', 'marketing') THEN
    v_out := v_out || jsonb_build_object(
      'ecosystem_links', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT *
          FROM public.ecosystem_links
          WHERE created_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb),
      'feedback', COALESCE((
        SELECT jsonb_agg(row_to_json(t)::jsonb)
        FROM (
          SELECT id, user_id, feature, rating, status, created_at
          FROM anthem.app_feedback
          WHERE created_at >= v_start
          ORDER BY created_at DESC
          LIMIT v_limit
        ) t
      ), '[]'::jsonb)
    );
  END IF;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_export_data_pack(int, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_export_data_pack(int, text, int) TO authenticated;

