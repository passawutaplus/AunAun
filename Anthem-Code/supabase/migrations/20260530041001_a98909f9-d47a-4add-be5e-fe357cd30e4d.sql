
-- Bump projects.likes when image_likes change
CREATE OR REPLACE FUNCTION public.bump_project_likes_from_image()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects SET likes = likes + 1 WHERE id = NEW.project_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects SET likes = GREATEST(likes - 1, 0) WHERE id = OLD.project_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_image_likes_bump ON public.image_likes;
CREATE TRIGGER trg_image_likes_bump
AFTER INSERT OR DELETE ON public.image_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_project_likes_from_image();

-- Recommend projects similar to what _user_id has liked recently
CREATE OR REPLACE FUNCTION public.recommend_from_likes(_user_id uuid, _limit integer DEFAULT 24)
RETURNS TABLE(
  id uuid, title text, category text, owner_id uuid,
  gallery_urls text[], cover_url text, similarity double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH liked AS (
    SELECT DISTINCT project_id
    FROM public.image_likes
    WHERE user_id = _user_id
    ORDER BY project_id
    LIMIT 20
  ),
  centroid AS (
    SELECT AVG(p.embedding)::vector AS v
    FROM public.projects p
    JOIN liked l ON l.project_id = p.id
    WHERE p.embedding IS NOT NULL
  )
  SELECT p.id, p.title, p.category, p.owner_id, p.gallery_urls, p.cover_url,
         1 - (p.embedding <=> (SELECT v FROM centroid)) AS similarity
  FROM public.projects p, centroid c
  WHERE c.v IS NOT NULL
    AND p.status = 'Published'
    AND p.embedding IS NOT NULL
    AND p.id NOT IN (SELECT project_id FROM liked)
  ORDER BY p.embedding <=> c.v
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.recommend_from_likes(uuid, integer) TO authenticated, anon;
