INSERT INTO storage.buckets (id, name, public) VALUES ('article-images', 'article-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view article images"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images');

CREATE POLICY "Admins upload article images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update article images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete article images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'article-images' AND has_role(auth.uid(), 'admin'::app_role));