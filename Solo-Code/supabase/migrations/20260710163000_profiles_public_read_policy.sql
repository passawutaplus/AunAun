-- Fix: profiles_public view needs row access on base table (RLS).
-- Without this, Designers feed / hero mockup carousel returns empty after launch_security_p0.

DROP POLICY IF EXISTS "profiles_select_public_active" ON public.profiles;
CREATE POLICY "profiles_select_public_active"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (coalesce(account_status, 'active') = 'active');

NOTIFY pgrst, 'reload schema';
