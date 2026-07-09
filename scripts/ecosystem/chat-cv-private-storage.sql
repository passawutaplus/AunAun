-- Restrict public read of sensitive anthem media (chat attachments, CV uploads).
-- Portfolio/community public images remain readable. Chat/CV require auth + path rules.

DROP POLICY IF EXISTS "anthem media public read" ON storage.objects;

CREATE POLICY "anthem media public read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] <> 'kyc'
    AND (storage.foldername(name))[2] <> 'chat'
    AND NOT ((storage.foldername(name))[3] = 'cv')
  );

-- Helper lives in public — Supabase blocks CREATE FUNCTION in storage schema.
CREATE OR REPLACE FUNCTION public.anthem_chat_path_readable(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared, public, storage
AS $$
  SELECT
    (
      (storage.foldername(_path))[1] = 'anthem'
      AND (storage.foldername(_path))[2] = 'chat'
      AND (storage.foldername(_path))[3] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND shared.user_in_conversation(
        ((storage.foldername(_path))[3])::uuid,
        auth.uid()
      )
    )
    OR public.has_role(auth.uid(), 'admin');
$$;

REVOKE ALL ON FUNCTION public.anthem_chat_path_readable(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anthem_chat_path_readable(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "anthem chat attachment read" ON storage.objects;
CREATE POLICY "anthem chat attachment read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-media'
    AND public.anthem_chat_path_readable(name)
  );

DROP POLICY IF EXISTS "anthem chat attachment upload" ON storage.objects;
CREATE POLICY "anthem chat attachment upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-media'
    AND public.anthem_chat_path_readable(name)
  );

DROP POLICY IF EXISTS "anthem chat attachment update" ON storage.objects;
CREATE POLICY "anthem chat attachment update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-media'
    AND public.anthem_chat_path_readable(name)
  )
  WITH CHECK (
    bucket_id = 'project-media'
    AND public.anthem_chat_path_readable(name)
  );

DROP POLICY IF EXISTS "anthem chat attachment delete" ON storage.objects;
CREATE POLICY "anthem chat attachment delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-media'
    AND public.anthem_chat_path_readable(name)
  );

DROP POLICY IF EXISTS "anthem cv owner read" ON storage.objects;
CREATE POLICY "anthem cv owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[3] = 'cv'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
