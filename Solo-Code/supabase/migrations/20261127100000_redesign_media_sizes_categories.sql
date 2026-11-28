-- Redesign 2026, step 1: columns the new Samecor design needs. Additive only.
--
--   * image sizes  — work images must never be cropped, so the layout needs each image's
--                    real width/height before it loads (Bento grid on the home page)
--   * sc_category  — the 22 CATEGORY values of the new design, kept next to the legacy
--                    `category` / `preferred_categories` (never overwritten)
--   * contact_email — a public contact address the creator chooses to show on About
--                    (profiles.email is the account e-mail and stays private)
--
-- Nothing reads these columns until the redesign ships, and the current app keeps working
-- unchanged. No trigger is added: the current app does not write the new columns, so run the
-- "backfill" block at the bottom again at cutover (it only fills rows that are still NULL).
--
-- Rollback: supabase/manual/rollback-20261127100000_redesign_media_sizes_categories.sql
-- Image sizes of existing rows: Anthem-Code/scripts/redesign-backfill-media-sizes.mjs

-- ---------------------------------------------------------------------------
-- 1. Image sizes
-- ---------------------------------------------------------------------------
-- cover_width/cover_height: the cover as displayed (EXIF rotation applied).
-- media_sizes: { "<image url>": [width, height], ... } for every other image of the row
-- (gallery_urls, content_blocks, context_images).

ALTER TABLE anthem.projects
  ADD COLUMN IF NOT EXISTS cover_width integer,
  ADD COLUMN IF NOT EXISTS cover_height integer,
  ADD COLUMN IF NOT EXISTS media_sizes jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE anthem.events
  ADD COLUMN IF NOT EXISTS cover_width integer,
  ADD COLUMN IF NOT EXISTS cover_height integer,
  ADD COLUMN IF NOT EXISTS media_sizes jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE anthem.projects
  DROP CONSTRAINT IF EXISTS projects_cover_size_check,
  ADD CONSTRAINT projects_cover_size_check CHECK (
    (cover_width IS NULL AND cover_height IS NULL)
    OR (cover_width BETWEEN 1 AND 32767 AND cover_height BETWEEN 1 AND 32767)
  ),
  DROP CONSTRAINT IF EXISTS projects_media_sizes_check,
  ADD CONSTRAINT projects_media_sizes_check CHECK (jsonb_typeof(media_sizes) = 'object');

ALTER TABLE anthem.events
  DROP CONSTRAINT IF EXISTS events_cover_size_check,
  ADD CONSTRAINT events_cover_size_check CHECK (
    (cover_width IS NULL AND cover_height IS NULL)
    OR (cover_width BETWEEN 1 AND 32767 AND cover_height BETWEEN 1 AND 32767)
  ),
  DROP CONSTRAINT IF EXISTS events_media_sizes_check,
  ADD CONSTRAINT events_media_sizes_check CHECK (jsonb_typeof(media_sizes) = 'object');

COMMENT ON COLUMN anthem.projects.media_sizes IS 'Redesign 2026: {"<image url>": [width, height]} for gallery and content images';
COMMENT ON COLUMN anthem.events.media_sizes IS 'Redesign 2026: {"<image url>": [width, height]} for gallery images';

-- ---------------------------------------------------------------------------
-- 2. CATEGORY (22 values)
-- ---------------------------------------------------------------------------

-- The list is written out in each CHECK on purpose: a constraint that calls a function would
-- run under whichever role inserts the row (the signup trigger inserts profiles).

-- Legacy category label -> new categories. A work takes the first one; a profile takes all.
-- Mapping approved by the owner on 2026-11-27 (samecor-handoff/docs/migration-plan.md).
CREATE OR REPLACE FUNCTION anthem.sc_categories_from_legacy(legacy text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE btrim(coalesce(legacy, ''))
    WHEN '' THEN ARRAY[]::text[]
    WHEN 'Graphic / Branding' THEN ARRAY['Graphic', 'Branding']
    WHEN 'Illustration / Art' THEN ARRAY['Illustration']
    WHEN 'Photography' THEN ARRAY['Photography']
    WHEN 'Video / Film' THEN ARRAY['Motion']
    WHEN 'Motion / Animation' THEN ARRAY['Motion']
    WHEN 'UI/UX' THEN ARRAY['UX/UI']
    WHEN 'Web / App' THEN ARRAY['UX/UI']
    WHEN '3D / CG / Game' THEN ARRAY['3D']
    WHEN 'Art Toy / Model' THEN ARRAY['Character']
    WHEN 'Product / Industrial' THEN ARRAY['Product']
    WHEN 'Fashion / Textile' THEN ARRAY['Fashion', 'Textile']
    ELSE ARRAY['Other']
  END;
$$;

ALTER TABLE anthem.projects
  ADD COLUMN IF NOT EXISTS sc_category text;

ALTER TABLE anthem.projects
  DROP CONSTRAINT IF EXISTS projects_sc_category_check,
  ADD CONSTRAINT projects_sc_category_check CHECK (
    sc_category IS NULL OR sc_category = ANY (ARRAY[
      'Illustration', 'Graphic', 'Branding', 'Typography', 'Painting', 'Drawing',
      'Printmaking', 'Risograph', 'Collage', 'Zine', 'Photography', 'Motion',
      '3D', 'Sculpture', 'Ceramics', 'Textile', 'Fashion', 'Product',
      'Character', 'UX/UI', 'Mixed Media', 'Other'
    ]::text[])
  );

CREATE INDEX IF NOT EXISTS projects_sc_category_idx ON anthem.projects (sc_category);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sc_categories text[],
  ADD COLUMN IF NOT EXISTS contact_email text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_sc_categories_check,
  ADD CONSTRAINT profiles_sc_categories_check CHECK (
    sc_categories IS NULL OR sc_categories <@ ARRAY[
      'Illustration', 'Graphic', 'Branding', 'Typography', 'Painting', 'Drawing',
      'Printmaking', 'Risograph', 'Collage', 'Zine', 'Photography', 'Motion',
      '3D', 'Sculpture', 'Ceramics', 'Textile', 'Fashion', 'Product',
      'Character', 'UX/UI', 'Mixed Media', 'Other'
    ]::text[]
  ),
  DROP CONSTRAINT IF EXISTS profiles_contact_email_check,
  ADD CONSTRAINT profiles_contact_email_check CHECK (
    contact_email IS NULL
    OR (char_length(contact_email) <= 254 AND contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
  );

COMMENT ON COLUMN public.profiles.contact_email IS 'Redesign 2026: public contact address chosen by the creator (not the account e-mail)';

-- profiles uses column-level grants
GRANT SELECT (sc_categories, contact_email) ON public.profiles TO anon, authenticated;
GRANT UPDATE (sc_categories, contact_email) ON public.profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Backfill (safe to run again: only rows that are still NULL)
-- ---------------------------------------------------------------------------

UPDATE anthem.projects
SET sc_category = (anthem.sc_categories_from_legacy(category))[1]
WHERE sc_category IS NULL
  AND btrim(coalesce(category, '')) <> '';

UPDATE public.profiles p
SET sc_categories = mapped.cats
FROM (
  SELECT pr.id, array_agg(d.cat ORDER BY d.first_pos) AS cats
  FROM public.profiles pr
  CROSS JOIN LATERAL (
    SELECT m.cat, min(l.pos * 10 + m.sub) AS first_pos
    FROM unnest(pr.preferred_categories) WITH ORDINALITY AS l(label, pos)
    CROSS JOIN LATERAL unnest(anthem.sc_categories_from_legacy(l.label)) WITH ORDINALITY AS m(cat, sub)
    GROUP BY m.cat
  ) AS d
  WHERE pr.sc_categories IS NULL
    AND coalesce(array_length(pr.preferred_categories, 1), 0) > 0
  GROUP BY pr.id
) AS mapped
WHERE p.id = mapped.id;
