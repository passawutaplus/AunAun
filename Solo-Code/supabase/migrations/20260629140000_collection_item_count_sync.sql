-- Keep collections.item_count in sync with collection_items rows
CREATE OR REPLACE FUNCTION anthem.sync_collection_item_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE anthem.collections
    SET item_count = item_count + 1, updated_at = now()
    WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE anthem.collections
    SET item_count = GREATEST(0, item_count - 1), updated_at = now()
    WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS collection_items_count_ins ON anthem.collection_items;
CREATE TRIGGER collection_items_count_ins
  AFTER INSERT ON anthem.collection_items
  FOR EACH ROW EXECUTE FUNCTION anthem.sync_collection_item_count();

DROP TRIGGER IF EXISTS collection_items_count_del ON anthem.collection_items;
CREATE TRIGGER collection_items_count_del
  AFTER DELETE ON anthem.collection_items
  FOR EACH ROW EXECUTE FUNCTION anthem.sync_collection_item_count();

UPDATE anthem.collections c
SET item_count = sub.cnt, updated_at = now()
FROM (
  SELECT collection_id, count(*)::int AS cnt
  FROM anthem.collection_items
  GROUP BY collection_id
) sub
WHERE c.id = sub.collection_id;
