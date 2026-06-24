
-- 1) Collections table
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  cover_url text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT true,
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public collections visible to all"
  ON public.collections FOR SELECT
  USING (is_public = true OR auth.uid() = owner_id);

CREATE POLICY "Owners insert their collections"
  ON public.collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners update their collections"
  ON public.collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners delete their collections"
  ON public.collections FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE INDEX idx_collections_owner ON public.collections(owner_id);

CREATE TRIGGER set_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Collection items
CREATE TABLE public.collection_items (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, project_id)
);

GRANT SELECT ON public.collection_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_items TO authenticated;
GRANT ALL ON public.collection_items TO service_role;

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items visible if parent collection visible"
  ON public.collection_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_items.collection_id
      AND (c.is_public = true OR c.owner_id = auth.uid())
  ));

CREATE POLICY "Owners can add items to their collection"
  ON public.collection_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.owner_id = auth.uid()
  ));

CREATE POLICY "Owners can remove items from their collection"
  ON public.collection_items FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.owner_id = auth.uid()
  ));

CREATE INDEX idx_collection_items_project ON public.collection_items(project_id);

-- 3) Trigger to maintain item_count
CREATE OR REPLACE FUNCTION public.update_collection_item_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.collections
      SET item_count = item_count + 1, updated_at = now()
      WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.collections
      SET item_count = GREATEST(item_count - 1, 0), updated_at = now()
      WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_collection_items_count
AFTER INSERT OR DELETE ON public.collection_items
FOR EACH ROW EXECUTE FUNCTION public.update_collection_item_count();

-- 4) Migrate existing bookmarks into a default "My Collection" per user
DO $$
DECLARE
  rec record;
  cid uuid;
BEGIN
  FOR rec IN
    SELECT DISTINCT user_id FROM public.project_bookmarks
  LOOP
    INSERT INTO public.collections (owner_id, name, description, is_public)
    VALUES (rec.user_id, 'My Collection', 'ผลงานที่ฉันบันทึกไว้', true)
    RETURNING id INTO cid;

    INSERT INTO public.collection_items (collection_id, project_id, added_at)
    SELECT cid, pb.project_id, pb.created_at
    FROM public.project_bookmarks pb
    WHERE pb.user_id = rec.user_id
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
