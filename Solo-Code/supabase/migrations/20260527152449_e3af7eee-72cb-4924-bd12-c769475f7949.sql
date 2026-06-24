-- Tighten public slip-upload storage policy: require share_token in path
DROP POLICY IF EXISTS "Public upload slips into existing jobs" ON storage.objects;

CREATE POLICY "Public upload slips with valid share token"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'job-tracker'
  AND (storage.foldername(name))[1] = 'slips'
  AND (storage.foldername(name))[2] IS NOT NULL
  AND (storage.foldername(name))[3] IS NOT NULL
  AND (
    -- Pattern A: slips/<job_id>/<share_token>/...
    EXISTS (
      SELECT 1 FROM public.job_trackers jt
      WHERE jt.id::text = (storage.foldername(name))[2]
        AND jt.share_token::text = (storage.foldername(name))[3]
    )
    -- Pattern B: slips/replace/<share_token>/... (used when replacing an existing slip)
    OR (
      (storage.foldername(name))[2] = 'replace'
      AND EXISTS (
        SELECT 1 FROM public.job_trackers jt
        WHERE jt.share_token::text = (storage.foldername(name))[3]
      )
    )
  )
);

-- Restrict calculator usage events read to admins only (counts still flow via SECURITY DEFINER RPC)
DROP POLICY IF EXISTS "Anyone can view calculator usage" ON public.calculator_usage_events;

CREATE POLICY "Admins can view calculator usage"
ON public.calculator_usage_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));