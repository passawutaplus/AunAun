-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Tighten storage SELECT policy: only owners can list their files
DROP POLICY IF EXISTS "Brand logos are publicly viewable" ON storage.objects;

CREATE POLICY "Owners can list own brand logos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'brand-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );