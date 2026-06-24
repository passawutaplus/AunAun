
-- Storage bucket for 50 ทวิ certificate files (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wht-certificates', 'wht-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: owner-only access via folder = uid
CREATE POLICY "wht-certificates owner select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'wht-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "wht-certificates owner insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wht-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "wht-certificates owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'wht-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "wht-certificates owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'wht-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);
