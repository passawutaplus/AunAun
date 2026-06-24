-- Resolve current Supabase Security Advisor errors without exposing write access.

DO $$
BEGIN
  IF to_regclass('public.payment_settings') IS NOT NULL THEN
    ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS payment_settings_authenticated_read ON public.payment_settings;
    CREATE POLICY payment_settings_authenticated_read
      ON public.payment_settings
      FOR SELECT
      TO authenticated
      USING (true);
    REVOKE ALL ON TABLE public.payment_settings FROM anon;
    GRANT SELECT ON TABLE public.payment_settings TO authenticated;
  END IF;

  IF to_regclass('public.storage_tier_config') IS NOT NULL THEN
    ALTER TABLE public.storage_tier_config ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS storage_tier_config_authenticated_read ON public.storage_tier_config;
    CREATE POLICY storage_tier_config_authenticated_read
      ON public.storage_tier_config
      FOR SELECT
      TO authenticated
      USING (true);
    REVOKE ALL ON TABLE public.storage_tier_config FROM anon;
    GRANT SELECT ON TABLE public.storage_tier_config TO authenticated;
  END IF;
END;
$$;

-- Pin SECURITY DEFINER functions that still inherit a mutable caller search_path.
-- Keep all application schemas available because this is a unified database.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      p.oid::regprocedure AS identity,
      n.nspname AS schema_name
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef
      AND n.nspname IN ('public', 'shared', 'anthem', 'ops', 'so1o')
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg
        WHERE cfg LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = %I, public, shared, anthem, ops, so1o, pg_catalog',
      fn.identity,
      fn.schema_name
    );
  END LOOP;
END;
$$;
