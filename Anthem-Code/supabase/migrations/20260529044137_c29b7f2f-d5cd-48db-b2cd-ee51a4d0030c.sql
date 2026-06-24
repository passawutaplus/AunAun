
-- 1. Restrict profile PII columns from anonymous users
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, username, bio, role, location, cover_url, avatar_url, website, instagram, facebook, skills, experience, created_at, updated_at)
  ON public.profiles TO anon;

-- 2. hiring_requests: enforce client_id ownership on insert
DROP POLICY IF EXISTS "Authenticated users can create requests" ON public.hiring_requests;
CREATE POLICY "Clients can create their own requests"
ON public.hiring_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id AND client_id <> freelancer_id);

-- 3. project_bookmarks: restrict reads to owner of bookmark or owner of project
DROP POLICY IF EXISTS "Bookmarks viewable by everyone" ON public.project_bookmarks;
CREATE POLICY "Bookmarks visible to owner or project owner"
ON public.project_bookmarks
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

-- 4. project_likes: same scoping
DROP POLICY IF EXISTS "Likes viewable by everyone" ON public.project_likes;
CREATE POLICY "Likes visible to owner or project owner"
ON public.project_likes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
);

-- 5. Revoke anon execute on increment_project_view RPC (prevent unauth metric manipulation)
REVOKE EXECUTE ON FUNCTION public.increment_project_view(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_project_view(uuid) TO authenticated;

-- 6. Lock down has_role to authenticated only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
