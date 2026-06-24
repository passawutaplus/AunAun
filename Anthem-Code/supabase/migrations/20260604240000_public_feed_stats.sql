-- Public aggregate stats for homepage hero (bypasses RLS on collab/hiring counts)

CREATE OR REPLACE FUNCTION public.public_feed_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'designers', (SELECT COUNT(*)::int FROM public.profiles),
    'projects', (
      SELECT COUNT(*)::int FROM anthem.projects WHERE status = 'Published'
    ),
    'collabs', (SELECT COUNT(*)::int FROM anthem.collab_requests),
    'hires', (SELECT COUNT(*)::int FROM anthem.hiring_requests)
  );
$$;

GRANT EXECUTE ON FUNCTION public.public_feed_stats() TO anon, authenticated;
