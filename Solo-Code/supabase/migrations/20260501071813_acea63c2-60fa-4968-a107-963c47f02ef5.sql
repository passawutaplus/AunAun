INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-covers', 'supplier-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Public read (display covers)
CREATE POLICY "Public can view supplier covers"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'supplier-covers');

-- Owner can upload to their folder (uid as first segment)
CREATE POLICY "Users upload own supplier covers"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'supplier-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own supplier covers"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'supplier-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own supplier covers"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'supplier-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );