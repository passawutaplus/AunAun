-- image_shares log
CREATE TABLE public.image_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  image_url text NOT NULL,
  user_id uuid NULL,
  platform text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.image_shares TO anon, authenticated;
GRANT ALL ON public.image_shares TO service_role;

ALTER TABLE public.image_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read shares" ON public.image_shares FOR SELECT USING (true);
CREATE POLICY "anyone insert share" ON public.image_shares FOR INSERT WITH CHECK (true);

CREATE INDEX idx_image_shares_project_img ON public.image_shares(project_id, image_url);
CREATE INDEX idx_image_likes_project_img ON public.image_likes(project_id, image_url);

-- Public count RPCs (SECURITY DEFINER so anon can count likes without reading rows)
CREATE OR REPLACE FUNCTION public.image_like_count(_project_id uuid, _image_url text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.image_likes
  WHERE project_id = _project_id AND image_url = _image_url;
$$;

CREATE OR REPLACE FUNCTION public.image_share_count(_project_id uuid, _image_url text)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.image_shares
  WHERE project_id = _project_id AND image_url = _image_url;
$$;

GRANT EXECUTE ON FUNCTION public.image_like_count(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.image_share_count(uuid, text) TO anon, authenticated;