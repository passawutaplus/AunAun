-- Private downloadable assets for portfolio projects (separate from public gallery media).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-assets',
  'project-assets',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'image/png',
    'image/jpeg',
    'image/webp',
    'font/ttf',
    'font/otf',
    'font/woff',
    'font/woff2',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- Owner upload: {user_id}/**
DROP POLICY IF EXISTS "project assets owner upload" ON storage.objects;
CREATE POLICY "project assets owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "project assets owner read" ON storage.objects;
CREATE POLICY "project assets owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "project assets owner delete" ON storage.objects;
CREATE POLICY "project assets owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Legacy uploads under project-media/anthem/{uid}/.../assets/ must not be public.
DROP POLICY IF EXISTS "anthem media public read" ON storage.objects;
CREATE POLICY "anthem media public read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-media'
    AND (storage.foldername(name))[1] = 'anthem'
    AND (storage.foldername(name))[2] <> 'kyc'
    AND name !~ '^anthem/[^/]+/[^/]+/assets/'
  );
