DROP POLICY IF EXISTS "Public can view share links" ON public.planner_share_links;

CREATE OR REPLACE FUNCTION public.get_planner_share_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  client_id text,
  month text,
  share_token uuid,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, user_id, client_id, month, share_token, expires_at, created_at
  FROM public.planner_share_links
  WHERE share_token = _token
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_planner_share_by_token(uuid) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime DROP TABLE public.calculator_usage_events;