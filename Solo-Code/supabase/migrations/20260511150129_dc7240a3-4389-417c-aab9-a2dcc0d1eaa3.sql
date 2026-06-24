
-- 1. Banner slides table
CREATE TABLE public.auth_banner_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_banner_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banner slides"
  ON public.auth_banner_slides FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert banner slides"
  ON public.auth_banner_slides FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update banner slides"
  ON public.auth_banner_slides FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete banner slides"
  ON public.auth_banner_slides FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_auth_banner_slides_updated_at
  BEFORE UPDATE ON public.auth_banner_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Storage bucket for banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('auth-banners', 'auth-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view auth banner images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'auth-banners');

CREATE POLICY "Admins can upload auth banner images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'auth-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update auth banner images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'auth-banners' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete auth banner images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'auth-banners' AND public.has_role(auth.uid(), 'admin'));

-- 3. Freelance field on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS freelance_field TEXT;

-- 4. Update handle_new_user to save freelance_field from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, freelance_field)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'freelance_field', '')
  );

  IF NEW.email = 'passawut.a.plus@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
