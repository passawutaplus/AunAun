
-- 1. Lock down archetype_results: only owner (or service role) can read
DROP POLICY IF EXISTS "public_can_select_via_share" ON public.archetype_results;

-- 2. Tighten brief-references storage upload policy
DROP POLICY IF EXISTS "Brief refs anyone insert" ON storage.objects;

CREATE POLICY "Brief refs anon insert in public folder"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'brief-references'
    AND (storage.foldername(name))[1] = 'public'
  );

CREATE POLICY "Brief refs auth insert in own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brief-references'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR (storage.foldername(name))[1] = 'public'
    )
  );
