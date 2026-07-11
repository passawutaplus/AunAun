-- Security hardening round 2b: revoke anon EXECUTE using exact function identity args
DO $tag$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef
      AND (
        (n.nspname, p.proname) IN (
          ('anthem','auto_grant_admin'),
          ('anthem','request_cashout'),
          ('anthem','ensure_wallet'),
          ('anthem','daily_gift_total'),
          ('public','force_purge_user'),
          ('public','get_admin_activity_feed'),
          ('public','kuy_delete_business_data'),
          ('public','vault_admin_list_captures'),
          ('public','vault_admin_list_feedback'),
          ('public','vault_admin_overview'),
          ('public','vault_admin_purge_captures'),
          ('public','delete_email'),
          ('public','_delete_storage_object'),
          ('public','available_gift_px'),
          ('public','get_my_wallet'),
          ('public','is_vault_super_admin'),
          ('public','inhouse_is_org_admin')
        )
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon', r.nspname, r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role', r.nspname, r.proname, r.args);
  END LOOP;
END $tag$;

