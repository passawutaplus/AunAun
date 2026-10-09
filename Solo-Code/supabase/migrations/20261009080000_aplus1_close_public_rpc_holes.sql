-- URGENT review fix (2026-10-09): close SECURITY DEFINER RPCs that anyone with the public anon key could call.
--
-- 1) public._user_rows_bytes(_user_id uuid, _sql text) ran `EXECUTE _sql` as the function owner and was executable by
--    `anon` and `authenticated`. That is arbitrary SQL for anyone holding the (public) anon key: it can read any table and,
--    through a data-modifying CTE, write to any table. It has no callers (no database function, no application code
--    references it), so it is dropped rather than just revoked.
-- 2) public.enqueue_email / read_email_batch / move_to_dlq were executable by `anon` and `authenticated`: anyone could put
--    messages on the transactional email queue (phishing from the platform's own sender) and read queued messages
--    (addresses, confirmation links). Only server code (service_role) and SECURITY DEFINER functions owned by postgres
--    (e.g. enqueue_line_notification) use them, so client EXECUTE is revoked.

DROP FUNCTION IF EXISTS public._user_rows_bytes(uuid, text);

REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- Same queue family, if present (name varies between deployments).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('delete_email', 'archive_email', 'delete_email_message')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;
