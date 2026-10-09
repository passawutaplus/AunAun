-- QA fix: allow authenticated owners to create and delete job trackers
DROP POLICY IF EXISTS "Owners insert job_trackers" ON public.job_trackers;
CREATE POLICY "Owners insert job_trackers"
  ON public.job_trackers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners delete job_trackers" ON public.job_trackers;
CREATE POLICY "Owners delete job_trackers"
  ON public.job_trackers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
