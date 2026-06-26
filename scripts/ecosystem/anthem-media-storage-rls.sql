-- Aplus1 media under project-media/anthem/{user_id}/** (portfolio, community, chat, studio).
-- KYC paths (anthem/kyc/{user_id}/) keep separate policies in kyc-pdpa-compliance.sql.

DROP POLICY IF EXISTS "anthem media public read" ON storage.objects;
CREATE POLICY "anthem media public read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] <> 'kyc'
  );

DROP POLICY IF EXISTS "anthem media owner upload" ON storage.objects;
CREATE POLICY "anthem media owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "anthem media owner read" ON storage.objects;
CREATE POLICY "anthem media owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "anthem media owner update" ON storage.objects;
CREATE POLICY "anthem media owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "anthem media owner delete" ON storage.objects;
CREATE POLICY "anthem media owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
