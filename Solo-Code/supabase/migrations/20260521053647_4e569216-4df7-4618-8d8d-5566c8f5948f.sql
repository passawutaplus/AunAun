-- Tighten public slip upload: require slips/<existing_job_id>/...
DROP POLICY IF EXISTS "Public upload slips" ON storage.objects;

CREATE POLICY "Public upload slips into existing jobs"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'job-tracker'
    AND (storage.foldername(name))[1] = 'slips'
    AND (storage.foldername(name))[2] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.job_trackers jt
      WHERE jt.id::text = (storage.foldername(name))[2]
    )
  );