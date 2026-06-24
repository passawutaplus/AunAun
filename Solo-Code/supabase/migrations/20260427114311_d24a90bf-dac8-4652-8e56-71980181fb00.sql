
-- 1) Remove the over-permissive SELECT policy that accidentally exposed all profile columns
DROP POLICY IF EXISTS "Public can view safe profile fields via view" ON public.profiles;

-- 2) Drop the view (we'll use a function instead for tighter control)
DROP VIEW IF EXISTS public.profiles_public;

-- 3) Create a SECURITY DEFINER function that returns ONLY safe public profile fields
CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  brand_name text,
  logo_url text,
  avatar_url text,
  tagline text,
  social_link text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.brand_name,
    p.logo_url,
    p.avatar_url,
    p.tagline,
    p.social_link,
    p.created_at
  FROM public.profiles p
  WHERE p.user_id = _user_id
  LIMIT 1;
$$;

-- 4) Allow anyone (including anon) to call this safe function
REVOKE ALL ON FUNCTION public.get_public_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated;
