-- Force-tighten grants after view recreate (Supabase default ALL grants)
REVOKE ALL ON public.ecosystem_notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.ecosystem_notifications TO authenticated;
GRANT ALL ON public.ecosystem_notifications TO service_role;

REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

REVOKE ALL ON public.profiles_public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles_public TO anon, authenticated;
GRANT ALL ON public.profiles_public TO service_role;

REVOKE ALL ON shared.notifications FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON shared.notifications TO authenticated;
GRANT ALL ON shared.notifications TO service_role;
