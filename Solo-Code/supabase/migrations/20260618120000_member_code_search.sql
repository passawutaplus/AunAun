-- Member code search
CREATE OR REPLACE FUNCTION public.admin_search_users(_query text, _limit int DEFAULT 25)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  username text,
  subscription_tier text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := trim(coalesce(_query, ''));
  member_suffix text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF q ~ '^S?[0-9A-Fa-f]{7}$' THEN
    member_suffix := upper(regexp_replace(q, '^S', ''));
  ELSE
    member_suffix := NULL;
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.display_name,
    p.username,
    p.subscription_tier,
    p.created_at
  FROM public.profiles p
  WHERE
    member_suffix IS NOT NULL
    AND upper(right(replace(p.user_id::text, '-', ''), 7)) = member_suffix
  OR (
    member_suffix IS NULL
    AND (
      q = ''
      OR p.display_name ILIKE '%' || q || '%'
      OR p.email ILIKE '%' || q || '%'
      OR p.username ILIKE '%' || q || '%'
      OR p.user_id::text ILIKE q || '%'
    )
  )
  ORDER BY p.created_at DESC
  LIMIT greatest(1, least(coalesce(_limit, 25), 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_search_users(text, int) TO authenticated;
