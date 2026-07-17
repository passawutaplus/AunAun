-- Safely update the public homepage stats RPC.
-- A successful collaboration is one Published project with at least one
-- collab_user_ids entry; it does not depend on a request or chat record.
--
-- The legacy "collabs" key is retained for older deployed clients.

BEGIN;

CREATE OR REPLACE FUNCTION public.public_feed_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
  WITH counts AS (
    SELECT
      (SELECT count(*)::int FROM public.profiles) AS designers,
      (SELECT count(*)::int FROM anthem.projects WHERE status = 'Published') AS projects,
      (SELECT count(*)::int FROM anthem.hiring_requests) AS hires,
      (
        SELECT count(*)::int
        FROM anthem.projects
        WHERE status = 'Published'
          AND cardinality(collab_user_ids) > 0
      ) AS successful_collabs
  )
  SELECT jsonb_build_object(
    'designers', designers,
    'projects', projects,
    'hires', hires,
    'successful_collabs', successful_collabs,
    'collabs', successful_collabs
  )
  FROM counts;
$$;

REVOKE ALL ON FUNCTION public.public_feed_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_feed_stats() TO anon, authenticated, service_role;

COMMIT;

SELECT public.public_feed_stats();
