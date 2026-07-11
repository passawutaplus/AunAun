-- Security hardening 2026-07-11
-- 1) Notification views: security_invoker + own-row filter + revoke anon
-- 2) profiles_public: security_invoker + revoke write grants
-- 3) Pin search_path on mutable helper functions
-- 4) Tighten permissive INSERT/SELECT policies
-- 5) Revoke anon EXECUTE on admin SECURITY DEFINER RPCs

-- ---------------------------------------------------------------------------
-- 1) Notification views (defense in depth)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.ecosystem_notifications;
CREATE VIEW public.ecosystem_notifications
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  app,
  kind,
  title,
  body,
  link,
  metadata,
  is_read,
  is_dismissed,
  created_at
FROM shared.notifications
WHERE user_id = auth.uid();

COMMENT ON VIEW public.ecosystem_notifications IS
  'Own-row notification feed (security_invoker + auth.uid filter).';

REVOKE ALL ON public.ecosystem_notifications FROM PUBLIC;
REVOKE ALL ON public.ecosystem_notifications FROM anon;
GRANT SELECT, UPDATE ON public.ecosystem_notifications TO authenticated;
GRANT ALL ON public.ecosystem_notifications TO service_role;

-- so1o-facing notifications view — keep columns, force invoker + own rows
DROP VIEW IF EXISTS public.notifications;
CREATE VIEW public.notifications
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  actor_user_id,
  actor_name,
  actor_avatar,
  type,
  project_id,
  message,
  url,
  read,
  created_at
FROM so1o.notifications
WHERE user_id = auth.uid();

COMMENT ON VIEW public.notifications IS
  'Own-row So1o notifications (security_invoker + auth.uid filter).';

REVOKE ALL ON public.notifications FROM PUBLIC;
REVOKE ALL ON public.notifications FROM anon;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- ---------------------------------------------------------------------------
-- 2) profiles_public — public read is intentional; block write via view
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  def text;
BEGIN
  SELECT pg_get_viewdef('public.profiles_public'::regclass, true) INTO def;
  IF def IS NULL THEN
    RAISE NOTICE 'profiles_public missing — skip';
    RETURN;
  END IF;
  EXECUTE format(
    'CREATE OR REPLACE VIEW public.profiles_public WITH (security_invoker = true) AS %s',
    def
  );
END $$;

REVOKE ALL ON public.profiles_public FROM PUBLIC;
GRANT SELECT ON public.profiles_public TO anon, authenticated;
GRANT ALL ON public.profiles_public TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Pin search_path on mutable helpers (advisor: function_search_path_mutable)
-- ---------------------------------------------------------------------------
ALTER FUNCTION public._catalog_demo_uid(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public._ai_daily_credit_limit() SET search_path = public, pg_temp;
ALTER FUNCTION public._ai_daily_period_end() SET search_path = public, pg_temp;
ALTER FUNCTION public._ai_daily_period_key() SET search_path = public, pg_temp;
ALTER FUNCTION public._catalog_demo_project_id(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public._design_drill_day_key() SET search_path = public, pg_temp;
ALTER FUNCTION public._profile_auth_id(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public._unsplash_art(integer, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.bangkok_today() SET search_path = public, pg_temp;
ALTER FUNCTION ops.format_issue_number(bigint) SET search_path = ops, public, pg_temp;
ALTER FUNCTION ops.touch_issues_updated_at() SET search_path = ops, public, pg_temp;
ALTER FUNCTION ops.assign_issue_number() SET search_path = ops, public, pg_temp;
ALTER FUNCTION anthem.set_project_series_updated_at() SET search_path = anthem, public, pg_temp;
ALTER FUNCTION anthem.set_project_canvas_templates_updated_at() SET search_path = anthem, public, pg_temp;
ALTER FUNCTION anthem.enforce_project_canvas_templates_limit() SET search_path = anthem, public, pg_temp;

-- ---------------------------------------------------------------------------
-- 4) Tighten always-true policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anyone insert share" ON anthem.image_shares;
DROP POLICY IF EXISTS "Anyone can view calculator usage" ON public.calculator_usage_events;

-- ---------------------------------------------------------------------------
-- 5) Revoke anon EXECUTE on admin SECURITY DEFINER functions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'anthem'
      AND p.prosecdef
      AND (
        p.proname LIKE 'admin_%'
        OR p.proname LIKE '_admin_%'
      )
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.nspname, r.proname, r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'shared', 'so1o')
      AND p.prosecdef
      AND p.proname LIKE 'admin_%'
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon',
      r.nspname, r.proname, r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;

-- Follow-up: force-tighten grants (Supabase default grants often re-add ALL on views)
REVOKE ALL ON public.ecosystem_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.ecosystem_notifications TO authenticated;
GRANT ALL ON public.ecosystem_notifications TO service_role;

REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

REVOKE ALL ON public.profiles_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles_public TO anon, authenticated;
GRANT ALL ON public.profiles_public TO service_role;

REVOKE ALL ON shared.notifications FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON shared.notifications TO authenticated;
GRANT ALL ON shared.notifications TO service_role;
