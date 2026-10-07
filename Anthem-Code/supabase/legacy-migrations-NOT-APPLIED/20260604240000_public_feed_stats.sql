DROP FUNCTION IF EXISTS public.public_feed_stats();

-- Hero feed stats RPC for Pixel100 home (demo + production).
CREATE OR REPLACE FUNCTION public.public_feed_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, anthem
AS $$
  SELECT json_build_object(
    'designers', (
      SELECT count(*)::int
      FROM public.profiles p
      WHERE p.username IS NOT NULL
        AND (p.email LIKE '%@demo.pixel100.com' OR p.email LIKE '%@demo.an1hem.app')
    ),
    'projects', (
      SELECT count(*)::int FROM anthem.projects WHERE status = 'Published'
    ),
    'collabs', (
      SELECT count(*)::int FROM anthem.collab_requests
    ),
    'hires', (
      SELECT count(*)::int FROM anthem.hiring_requests
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.public_feed_stats() TO anon, authenticated, service_role;