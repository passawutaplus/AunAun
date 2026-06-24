
DROP POLICY IF EXISTS "Public can view job_trackers" ON public.job_trackers;
DROP POLICY IF EXISTS "Public can view job_events" ON public.job_events;
DROP POLICY IF EXISTS "Public can view job_milestones" ON public.job_milestones;
DROP POLICY IF EXISTS "Public can view job_slips" ON public.job_slips;
DROP POLICY IF EXISTS "Public can insert job_slips" ON public.job_slips;
