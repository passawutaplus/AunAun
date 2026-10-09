-- Review fix (2026-10-09): back-office (admin) helpers and grants.
--
-- 1) Nine anthem.admin_* functions call public._admin_actor() / public._admin_audit(), but the helpers only exist in
--    schema `anthem`. Every call fails with "function public._admin_actor() does not exist", so these admin actions have
--    been dead (they fail closed): admin_set_user_role, admin_reject_cashout, admin_mark_cashout_paid, admin_update_gift,
--    admin_update_gift_limits, admin_dismiss_notification, admin_delete_project/comment/collection (anthem variants).
--    The app routes the first six to schema `anthem` (tableRouting.ts). Fix: thin public wrappers around the anthem helpers.
--    The wrappers are not callable by clients; the admin_* functions are SECURITY DEFINER, so they call them as the owner.
-- 2) anthem._admin_audit() was executable by every signed-in user, so anyone could write rows into the admin audit log.
--    It is only ever called from SECURITY DEFINER functions, so client EXECUTE is revoked.
-- 3) public.admin_* RPCs were executable by `anon` (they refuse non-admins at runtime). Closed anyway: admin RPCs are
--    for signed-in users only.

CREATE OR REPLACE FUNCTION public._admin_actor()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  SELECT anthem._admin_actor();
$$;

CREATE OR REPLACE FUNCTION public._admin_audit(
  _action text,
  _target_type text,
  _target_id uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  SELECT anthem._admin_audit(_action, _target_type, _target_id, _metadata);
$$;

REVOKE ALL ON FUNCTION public._admin_actor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._admin_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._admin_actor() TO service_role;
GRANT EXECUTE ON FUNCTION public._admin_audit(text, text, uuid, jsonb) TO service_role;

REVOKE ALL ON FUNCTION anthem._admin_actor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION anthem._admin_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION anthem._admin_actor() TO service_role;
GRANT EXECUTE ON FUNCTION anthem._admin_audit(text, text, uuid, jsonb) TO service_role;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'anthem')
      AND p.proname LIKE 'admin\_%'
      AND p.prokind = 'f'
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;
