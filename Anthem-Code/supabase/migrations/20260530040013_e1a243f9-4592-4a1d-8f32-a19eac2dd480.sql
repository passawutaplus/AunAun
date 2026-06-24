CREATE EXTENSION IF NOT EXISTS vector;

-- Per-image likes
CREATE TABLE public.image_likes (
  user_id uuid NOT NULL,
  project_id uuid NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id, image_url)
);
GRANT SELECT, INSERT, DELETE ON public.image_likes TO authenticated;
GRANT ALL ON public.image_likes TO service_role;
ALTER TABLE public.image_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own image likes" ON public.image_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own image likes" ON public.image_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own image likes" ON public.image_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Inspire boards
CREATE TABLE public.inspire_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  cover_url text NOT NULL DEFAULT '',
  item_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.inspire_boards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspire_boards TO authenticated;
GRANT ALL ON public.inspire_boards TO service_role;
ALTER TABLE public.inspire_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boards public read" ON public.inspire_boards FOR SELECT USING (true);
CREATE POLICY "owner manage boards" ON public.inspire_boards FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Inspire items
CREATE TABLE public.inspire_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.inspire_boards(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  image_url text NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board_id, project_id, image_url)
);
GRANT SELECT ON public.inspire_items TO anon;
GRANT SELECT, INSERT, DELETE ON public.inspire_items TO authenticated;
GRANT ALL ON public.inspire_items TO service_role;
ALTER TABLE public.inspire_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items public read" ON public.inspire_items FOR SELECT USING (true);
CREATE POLICY "owner insert items" ON public.inspire_items FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM public.inspire_boards b WHERE b.id = board_id AND b.owner_id = auth.uid()));
CREATE POLICY "owner delete items" ON public.inspire_items FOR DELETE TO authenticated USING (EXISTS(SELECT 1 FROM public.inspire_boards b WHERE b.id = board_id AND b.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.update_inspire_board_count() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.inspire_boards SET item_count=item_count+1, cover_url=COALESCE(NULLIF(cover_url,''), NEW.image_url), updated_at=now() WHERE id=NEW.board_id;
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.inspire_boards SET item_count=GREATEST(item_count-1,0), updated_at=now() WHERE id=OLD.board_id;
    RETURN OLD;
  END IF; RETURN NULL;
END $$;
CREATE TRIGGER trg_inspire_items_count AFTER INSERT OR DELETE ON public.inspire_items FOR EACH ROW EXECUTE FUNCTION public.update_inspire_board_count();

-- Project embeddings for similarity
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS projects_embedding_idx ON public.projects USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION public.match_similar_projects(_query vector(1536), _exclude uuid, _limit int DEFAULT 30)
RETURNS TABLE(id uuid, title text, category text, owner_id uuid, gallery_urls text[], cover_url text, similarity float)
LANGUAGE sql STABLE SET search_path=public AS $$
  SELECT p.id, p.title, p.category, p.owner_id, p.gallery_urls, p.cover_url, 1-(p.embedding <=> _query) AS similarity
  FROM public.projects p
  WHERE p.status='Published' AND p.id <> _exclude AND p.embedding IS NOT NULL
  ORDER BY p.embedding <=> _query LIMIT _limit;
$$;