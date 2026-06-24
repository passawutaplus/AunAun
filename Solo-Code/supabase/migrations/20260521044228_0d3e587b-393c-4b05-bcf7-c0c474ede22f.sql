CREATE OR REPLACE FUNCTION public.get_planner_posts_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  client_id text,
  title text,
  post_date date,
  post_time text,
  platforms text[],
  custom_platforms text[],
  status text,
  link text,
  caption text,
  image_url text,
  approval_status text,
  client_feedback text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.client_id, p.title, p.post_date, p.post_time,
         p.platforms, p.custom_platforms, p.status, p.link, p.caption,
         p.image_url, p.approval_status, p.client_feedback
  FROM public.planner_share_links sl
  JOIN public.planner_posts p
    ON p.user_id = sl.user_id
   AND (sl.client_id IS NULL OR p.client_id = sl.client_id)
   AND to_char(p.post_date::timestamptz, 'YYYY-MM') = sl.month
  WHERE sl.share_token = _token
    AND (sl.expires_at IS NULL OR sl.expires_at > now())
  ORDER BY p.post_date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_planner_posts_by_token(uuid) TO anon, authenticated;