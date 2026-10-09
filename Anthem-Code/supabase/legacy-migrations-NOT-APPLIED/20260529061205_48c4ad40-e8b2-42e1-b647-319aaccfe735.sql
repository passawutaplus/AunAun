
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'hiring',
  ADD COLUMN IF NOT EXISTS poster_role text NOT NULL DEFAULT 'studio',
  ADD COLUMN IF NOT EXISTS employment_type text NOT NULL DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS attached_cv_url text,
  ADD COLUMN IF NOT EXISTS attached_portfolio_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.job_posts ALTER COLUMN studio_id DROP NOT NULL;

-- Replace policies to allow non-studio posts
DROP POLICY IF EXISTS "Studio admins create jobs" ON public.job_posts;
DROP POLICY IF EXISTS "Studio admins delete jobs" ON public.job_posts;
DROP POLICY IF EXISTS "Studio admins update jobs" ON public.job_posts;
DROP POLICY IF EXISTS "Open jobs viewable by everyone" ON public.job_posts;

CREATE POLICY "Open jobs viewable by everyone"
ON public.job_posts FOR SELECT
USING (
  status = 'open'::job_status
  OR posted_by = auth.uid()
  OR (studio_id IS NOT NULL AND is_studio_member(studio_id, auth.uid()))
);

CREATE POLICY "Users create their own jobs"
ON public.job_posts FOR INSERT TO authenticated
WITH CHECK (
  posted_by = auth.uid()
  AND (studio_id IS NULL OR is_studio_admin(studio_id, auth.uid()))
);

CREATE POLICY "Owners or studio admins update jobs"
ON public.job_posts FOR UPDATE TO authenticated
USING (
  posted_by = auth.uid()
  OR (studio_id IS NOT NULL AND is_studio_admin(studio_id, auth.uid()))
);

CREATE POLICY "Owners or studio admins delete jobs"
ON public.job_posts FOR DELETE TO authenticated
USING (
  posted_by = auth.uid()
  OR (studio_id IS NOT NULL AND is_studio_admin(studio_id, auth.uid()))
);
