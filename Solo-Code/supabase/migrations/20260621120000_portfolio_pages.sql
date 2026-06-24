-- Portfolio pages: shareable freelancer pitch under Data -> Portfolio

CREATE TABLE IF NOT EXISTS public.portfolio_pages (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published')),
  hero            jsonb NOT NULL DEFAULT '{}'::jsonb,
  about           jsonb NOT NULL DEFAULT '{}'::jsonb,
  skills          jsonb NOT NULL DEFAULT '[]'::jsonb,
  experience      jsonb NOT NULL DEFAULT '[]'::jsonb,
  featured_work   jsonb NOT NULL DEFAULT '[]'::jsonb,
  external_links  jsonb NOT NULL DEFAULT '[]'::jsonb,
  resume          jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility      jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS portfolio_pages_slug_idx
  ON public.portfolio_pages (lower(slug));

CREATE INDEX IF NOT EXISTS portfolio_pages_status_idx
  ON public.portfolio_pages (status) WHERE status = 'published';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_pages TO authenticated;
GRANT ALL ON public.portfolio_pages TO service_role;

ALTER TABLE public.portfolio_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portfolio_pages_user_select ON public.portfolio_pages;
CREATE POLICY portfolio_pages_user_select ON public.portfolio_pages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS portfolio_pages_user_insert ON public.portfolio_pages;
CREATE POLICY portfolio_pages_user_insert ON public.portfolio_pages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS portfolio_pages_user_update ON public.portfolio_pages;
CREATE POLICY portfolio_pages_user_update ON public.portfolio_pages
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS portfolio_pages_user_delete ON public.portfolio_pages;
CREATE POLICY portfolio_pages_user_delete ON public.portfolio_pages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS portfolio_pages_service_role ON public.portfolio_pages;
CREATE POLICY portfolio_pages_service_role ON public.portfolio_pages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_portfolio_pages_updated_at ON public.portfolio_pages;
CREATE TRIGGER trg_portfolio_pages_updated_at
  BEFORE UPDATE ON public.portfolio_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_portfolio_by_slug(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.portfolio_pages%ROWTYPE;
BEGIN
  SELECT * INTO _row
    FROM public.portfolio_pages
   WHERE lower(slug) = lower(trim(_slug))
     AND status = 'published'
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'slug', _row.slug,
    'hero', _row.hero,
    'about', _row.about,
    'skills', _row.skills,
    'experience', _row.experience,
    'featured_work', _row.featured_work,
    'external_links', _row.external_links,
    'resume', _row.resume,
    'visibility', _row.visibility,
    'published_at', _row.published_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_portfolio_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_portfolio_by_slug(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_portfolio_slug_available(_slug text, _user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized text := lower(trim(_slug));
BEGIN
  IF _normalized IS NULL OR length(_normalized) < 3 THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM public.portfolio_pages
     WHERE lower(slug) = _normalized
       AND (_user_id IS NULL OR user_id IS DISTINCT FROM _user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_portfolio_slug_available(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_portfolio_slug_available(text, uuid) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-media',
  'portfolio-media',
  true,
  10485760,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS portfolio_media_storage_select ON storage.objects;
CREATE POLICY portfolio_media_storage_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'portfolio-media');

DROP POLICY IF EXISTS portfolio_media_storage_insert ON storage.objects;
CREATE POLICY portfolio_media_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS portfolio_media_storage_update ON storage.objects;
CREATE POLICY portfolio_media_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'portfolio-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS portfolio_media_storage_delete ON storage.objects;
CREATE POLICY portfolio_media_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'portfolio-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS portfolio_media_storage_service ON storage.objects;
CREATE POLICY portfolio_media_storage_service ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'portfolio-media')
  WITH CHECK (bucket_id = 'portfolio-media');
