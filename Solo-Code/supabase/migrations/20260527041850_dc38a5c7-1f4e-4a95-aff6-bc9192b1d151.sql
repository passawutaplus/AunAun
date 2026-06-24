-- 1. Drop unused tables from realtime publication (no client subscribes to these)
ALTER PUBLICATION supabase_realtime DROP TABLE public.typo_pairs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.spec_checklist_state;
ALTER PUBLICATION supabase_realtime DROP TABLE public.vision_canvases;
ALTER PUBLICATION supabase_realtime DROP TABLE public.vision_canvas_reactions;

-- 2. Add owner-scoped realtime policy for dashboard_* topics
-- Channel formats: dashboard_tasks_<uid>_*, dashboard_jobs_<uid>_*, dashboard_job_tasks_<uid>_*
CREATE POLICY "realtime dashboard topics owner only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  CASE
    WHEN realtime.topic() LIKE 'dashboard_job_tasks_%' THEN
      realtime.topic() LIKE ('dashboard_job_tasks_' || auth.uid()::text || '_%')
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    WHEN realtime.topic() LIKE 'dashboard_jobs_%' THEN
      realtime.topic() LIKE ('dashboard_jobs_' || auth.uid()::text || '_%')
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    WHEN realtime.topic() LIKE 'dashboard_tasks_%' THEN
      realtime.topic() LIKE ('dashboard_tasks_' || auth.uid()::text || '_%')
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    ELSE false
  END
);

-- 3. Set fixed search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = pgmq, public, pg_catalog;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = pgmq, public, pg_catalog;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = pgmq, public, pg_catalog;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = pgmq, public, pg_catalog;
