-- Optional header banner image on quotations (preview / PDF presentation)
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS header_image_url TEXT;

COMMENT ON COLUMN public.quotations.header_image_url IS 'Optional full-width banner image shown at top of quotation preview';

INSERT INTO storage.buckets (id, name, public)
VALUES ('quotation-banners', 'quotation-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view quotation banners"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'quotation-banners');

CREATE POLICY "Users upload own quotation banners"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quotation-banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users update own quotation banners"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'quotation-banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own quotation banners"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'quotation-banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
