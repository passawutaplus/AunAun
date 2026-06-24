-- 1) Tighten job_tracker_step_comments INSERT: authenticated owners only
DROP POLICY IF EXISTS "Owners insert comments on their jobs" ON public.job_tracker_step_comments;
CREATE POLICY "Owners insert comments on their jobs"
  ON public.job_tracker_step_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_role = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.job_trackers j
      WHERE j.id = job_id AND j.user_id = auth.uid()
    )
  );

-- 2) Fix realtime job tracker topic authorization (full UUID extraction)
DROP POLICY IF EXISTS "realtime job tracker topics owner only" ON realtime.messages;
CREATE POLICY "realtime job tracker topics owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'track-%' THEN
      EXISTS (
        SELECT 1 FROM public.job_trackers jt
        WHERE jt.id::text = substring(realtime.topic() FROM 7)
          AND (jt.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      )
    WHEN realtime.topic() LIKE 'job-%' THEN
      EXISTS (
        SELECT 1 FROM public.job_trackers jt
        WHERE jt.id::text = substring(realtime.topic() FROM 5)
          AND (jt.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      )
    ELSE false
  END
);

-- 3) Fix realtime planner topic authorization (full UUID extraction)
DROP POLICY IF EXISTS "realtime planner topics owner only" ON realtime.messages;
CREATE POLICY "realtime planner topics owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'planner-approvals-%' THEN
      substring(realtime.topic() FROM 19) = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    WHEN realtime.topic() LIKE 'planner-%' THEN
      substring(realtime.topic() FROM 9) = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
    ELSE false
  END
);