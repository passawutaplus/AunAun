
-- Table for dashboard banner slides (admin-managed)
CREATE TABLE public.dashboard_banner_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dashboard_banner_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_banner_slides TO authenticated;
GRANT ALL ON public.dashboard_banner_slides TO service_role;

ALTER TABLE public.dashboard_banner_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active dashboard slides"
  ON public.dashboard_banner_slides FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert dashboard slides"
  ON public.dashboard_banner_slides FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dashboard slides"
  ON public.dashboard_banner_slides FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dashboard slides"
  ON public.dashboard_banner_slides FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_dashboard_banner_slides_updated_at
  BEFORE UPDATE ON public.dashboard_banner_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for dashboard banner images (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('dashboard-banners', 'dashboard-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Dashboard banner images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dashboard-banners');

CREATE POLICY "Admins can upload dashboard banner images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dashboard-banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dashboard banner images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dashboard-banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dashboard banner images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dashboard-banners' AND has_role(auth.uid(), 'admin'::app_role));
