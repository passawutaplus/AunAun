-- Readable event URLs: /exhibition/<slug> instead of /exhibition/<uuid>.
-- Slug = the title in lower case, Latin + Thai letters and digits kept, everything else → "-", max 80 chars;
-- a clash gets "-2", "-3", … Old /exhibition/<uuid> links keep working (the app redirects to the slug).
-- Set once when the event is created (or on first save after this migration); a later title edit keeps
-- the slug so shared links never break. Venues (parent_id set) get slugs too.

ALTER TABLE anthem.events ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION anthem.event_slug_base(_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = anthem, public
AS $$
  SELECT coalesce(
    nullif(
      left(
        btrim(regexp_replace(lower(coalesce(_title, '')), '[^a-z0-9฀-๿]+', '-', 'g'), '-'),
        80
      ),
      ''
    ),
    'event'
  );
$$;

CREATE OR REPLACE FUNCTION anthem.event_set_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = anthem, public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 1;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    RETURN NEW;
  END IF;
  base := btrim(anthem.event_slug_base(NEW.title), '-');
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM anthem.events WHERE slug = candidate AND id <> NEW.id) LOOP
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_set_slug ON anthem.events;
CREATE TRIGGER events_set_slug
  BEFORE INSERT OR UPDATE OF title, slug ON anthem.events
  FOR EACH ROW EXECUTE FUNCTION anthem.event_set_slug();

-- Backfill: oldest first, so the original event keeps the plain slug.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM anthem.events WHERE slug IS NULL ORDER BY created_at, id LOOP
    UPDATE anthem.events SET slug = NULL WHERE id = r.id; -- fires the trigger
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS events_slug_key ON anthem.events (slug);

-- Rollback:
--   DROP TRIGGER IF EXISTS events_set_slug ON anthem.events;
--   DROP FUNCTION IF EXISTS anthem.event_set_slug();
--   DROP FUNCTION IF EXISTS anthem.event_slug_base(text);
--   DROP INDEX IF EXISTS anthem.events_slug_key;
--   ALTER TABLE anthem.events DROP COLUMN IF EXISTS slug;
