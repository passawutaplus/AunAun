-- Phase 1.1: Remove overly permissive RLS policies on job tracking tables
-- (public access is now token-gated via server functions using supabaseAdmin)
DROP POLICY IF EXISTS "Public can view job_trackers" ON public.job_trackers;
DROP POLICY IF EXISTS "Public can view job_milestones" ON public.job_milestones;
DROP POLICY IF EXISTS "Public can view job_events" ON public.job_events;
DROP POLICY IF EXISTS "Public can view job_slips" ON public.job_slips;
DROP POLICY IF EXISTS "Public can insert job_slips" ON public.job_slips;

-- Phase 1.2: Lock down search_path on remaining function
ALTER FUNCTION public.gen_tracking_code() SET search_path = public;

-- Phase 1.3: Drop the old single-arg force_purge_user overload that relies on auth.uid()
-- (which is null inside server functions). Keep only the (uuid, uuid) version.
DROP FUNCTION IF EXISTS public.force_purge_user(uuid);