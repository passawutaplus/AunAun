-- Fix project-media storage RLS for Anthem namespace paths (anthem/{userId}/...)

CREATE OR REPLACE FUNCTION public.project_media_user_owns_path(object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage, shared
AS $$
DECLARE
  folders text[];
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  folders := storage.foldername(object_name);

  -- Legacy So1o: {userId}/...
  IF folders[1] = uid::text THEN
    RETURN true;
  END IF;

  -- Anthem portfolio / cv: anthem/{userId}/...
  IF folders[1] = 'anthem' AND folders[2] = uid::text THEN
    RETURN true;
  END IF;

  -- Anthem studios: anthem/studios/{userId}/...
  IF folders[1] = 'anthem' AND folders[2] = 'studios' AND folders[3] = uid::text THEN
    RETURN true;
  END IF;

  -- Anthem chat: anthem/chat/{conversationId}/...
  IF folders[1] = 'anthem' AND folders[2] = 'chat' AND folders[3] IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM shared.conversations c
      WHERE c.id = folders[3]::uuid
        AND (c.client_id = uid OR c.freelancer_id = uid)
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.project_media_user_owns_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_media_user_owns_path(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users upload to own folder" ON storage.objects;
CREATE POLICY "Users upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-media'
    AND public.project_media_user_owns_path(name)
  );

DROP POLICY IF EXISTS "Users update own files" ON storage.objects;
CREATE POLICY "Users update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-media'
    AND public.project_media_user_owns_path(name)
  );

DROP POLICY IF EXISTS "Users delete own files" ON storage.objects;
CREATE POLICY "Users delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-media'
    AND public.project_media_user_owns_path(name)
  );

-- Ensure public read (bucket is public)
DROP POLICY IF EXISTS "Project media public read" ON storage.objects;
CREATE POLICY "Project media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-media');
