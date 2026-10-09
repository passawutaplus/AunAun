-- Review fix (2026-10-09): KYC documents (ID card, selfie, bank book) must not live in a public bucket.
--
-- Until now they were stored in `project-media` under anthem/kyc/<user>/..., and `project-media` is a PUBLIC bucket:
-- anyone holding an object URL can download it, because public buckets are served without evaluating storage RLS.
-- The policy that hides the kyc folder only applies to API access (list / authenticated download), not to /object/public/ URLs.
--
-- New private bucket `kyc-documents`, path convention <user_id>/<doc_type>/<uuid>.<ext>:
--   * the owner can upload into their own folder,
--   * the owner and admins can read (the app only ever uses short-lived signed URLs),
--   * the owner can delete only while no KYC request is pending/approved (same rule as the old policy),
--   * nobody can UPDATE (the client no longer uses upsert; names are random UUIDs).
-- Existing objects are moved by Anthem-Code/scripts/migrate-kyc-to-private-bucket.mjs, which also rewrites
-- shared.kyc_documents.storage_path. Until then the app still reads legacy `anthem/kyc/...` paths from project-media.
-- Deploy order: apply this migration, then deploy the app, then run the move script.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc-documents', 'kyc-documents', false, 10485760, ARRAY['image/jpeg', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.kyc_documents_owner_mutable(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared, public, storage
AS $$
  SELECT (storage.foldername(_path))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1
      FROM shared.kyc_requests r
      WHERE r.user_id = auth.uid()
        AND r.status IN ('pending', 'approved')
    );
$$;

REVOKE ALL ON FUNCTION public.kyc_documents_owner_mutable(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kyc_documents_owner_mutable(text) TO authenticated;

DROP POLICY IF EXISTS "kyc documents owner upload" ON storage.objects;
CREATE POLICY "kyc documents owner upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "kyc documents owner or admin read" ON storage.objects;
CREATE POLICY "kyc documents owner or admin read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "kyc documents owner delete" ON storage.objects;
CREATE POLICY "kyc documents owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.kyc_documents_owner_mutable(name)
  );
