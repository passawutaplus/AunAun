
-- 1. Hide email/phone from anon on profiles (authenticated users still see contact info for marketplace use)
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  id, display_name, username, bio, role, website, line_id, facebook, instagram,
  avatar_url, cover_url, skills, experience, location, created_at, updated_at
) ON public.profiles TO anon;

-- 2. Remove hiring_requests from realtime publication (PII)
ALTER PUBLICATION supabase_realtime DROP TABLE public.hiring_requests;

-- 3. Tighten hiring_requests INSERT policy to authenticated role
DROP POLICY IF EXISTS "Authenticated users can create requests" ON public.hiring_requests;
CREATE POLICY "Authenticated users can create requests"
  ON public.hiring_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Add explicit SELECT policy on project-media storage bucket (documents intentional public access)
CREATE POLICY "project-media is publicly readable"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'project-media');

-- 5. Restrict has_role EXECUTE — anon cannot call it (no anon RLS policy uses it)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
