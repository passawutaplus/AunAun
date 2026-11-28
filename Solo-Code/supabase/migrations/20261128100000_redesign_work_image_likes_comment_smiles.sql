-- Redesign 2026, step 4 (Work page): a like on each picture of a work, and a smile on comments.
-- Owner decision 2026-11-28: likes per picture as in the mock; add the smile table.
-- Undo: supabase/manual/rollback-20261128100000_redesign_work_image_likes_comment_smiles.sql
--
-- A picture is named by its URL as stored in the work (content_blocks, or gallery_urls when the
-- work has no picture blocks). anthem.project_likes stays the "liked this work" list that the old
-- pages, notifications and counts read: a trigger keeps it in step (liked any picture = liked the work).

-- 1. Likes per picture ------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS anthem.project_image_likes (
  project_id uuid NOT NULL REFERENCES anthem.projects(id) ON DELETE CASCADE,
  image_url text NOT NULL CHECK (char_length(image_url) BETWEEN 8 AND 2048),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, image_url, user_id)
);

CREATE INDEX IF NOT EXISTS project_image_likes_user_project_idx
  ON anthem.project_image_likes (user_id, project_id);

ALTER TABLE anthem.project_image_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_image_likes_read ON anthem.project_image_likes;
CREATE POLICY project_image_likes_read ON anthem.project_image_likes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS project_image_likes_insert_own ON anthem.project_image_likes;
CREATE POLICY project_image_likes_insert_own ON anthem.project_image_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS project_image_likes_delete_own ON anthem.project_image_likes;
CREATE POLICY project_image_likes_delete_own ON anthem.project_image_likes
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON anthem.project_image_likes FROM anon, authenticated;
GRANT SELECT ON anthem.project_image_likes TO anon, authenticated;
GRANT INSERT, DELETE ON anthem.project_image_likes TO authenticated;

-- Liked any picture of a work = liked the work (anthem.project_likes). Runs as the caller, so the
-- project_likes policies (own rows only) still apply.
CREATE OR REPLACE FUNCTION anthem.sync_project_like_from_image_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO anthem.project_likes (project_id, user_id)
    VALUES (NEW.project_id, NEW.user_id)
    ON CONFLICT (project_id, user_id) DO NOTHING;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM anthem.project_image_likes l
    WHERE l.project_id = OLD.project_id AND l.user_id = OLD.user_id
  ) THEN
    DELETE FROM anthem.project_likes
    WHERE project_id = OLD.project_id AND user_id = OLD.user_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_like_from_image_like ON anthem.project_image_likes;
CREATE TRIGGER trg_sync_project_like_from_image_like
  AFTER INSERT OR DELETE ON anthem.project_image_likes
  FOR EACH ROW EXECUTE FUNCTION anthem.sync_project_like_from_image_like();

-- Likes of one work, per picture, and which ones the caller liked.
CREATE OR REPLACE FUNCTION public.project_image_like_summary(_project_id uuid)
RETURNS TABLE (image_url text, likes integer, liked boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT l.image_url,
    count(*)::int,
    coalesce(bool_or(l.user_id = (SELECT auth.uid())), false)
  FROM anthem.project_image_likes l
  WHERE l.project_id = _project_id
  GROUP BY l.image_url;
$$;

GRANT EXECUTE ON FUNCTION public.project_image_like_summary(uuid) TO anon, authenticated;

-- Existing likes of a whole work go onto its first picture (the same first picture the Work page
-- shows: first picture block in content_blocks, else gallery_urls[1]). Safe to run again: it only
-- adds likes for people who have no picture like on that work yet (run once more at cutover for
-- likes made on the old pages in between).
WITH blocks AS (
  SELECT p.id AS project_id, e.b, e.i
  FROM anthem.projects p
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(p.content_blocks) = 'array' THEN p.content_blocks ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS e(b, i)
),
block_images AS (
  SELECT b.project_id, b.i, u.k, trim(u.url) AS url
  FROM blocks b
  CROSS JOIN LATERAL (
    SELECT t.v AS url, t.k
    FROM jsonb_array_elements_text(b.b -> 'urls') WITH ORDINALITY AS t(v, k)
    WHERE b.b ->> 'type' = 'image' AND jsonb_typeof(b.b -> 'urls') = 'array'
      AND jsonb_array_length(b.b -> 'urls') > 0
    UNION ALL
    SELECT b.b ->> 'url', 1
    WHERE b.b ->> 'type' = 'image_text'
       OR (b.b ->> 'type' = 'image'
           AND NOT (jsonb_typeof(b.b -> 'urls') = 'array' AND jsonb_array_length(b.b -> 'urls') > 0))
  ) u
  WHERE coalesce(trim(u.url), '') <> ''
),
first_image AS (
  SELECT p.id AS project_id,
    coalesce(
      (SELECT bi.url FROM block_images bi WHERE bi.project_id = p.id ORDER BY bi.i, bi.k LIMIT 1),
      nullif(trim(p.gallery_urls[1]), '')
    ) AS image_url
  FROM anthem.projects p
)
INSERT INTO anthem.project_image_likes (project_id, image_url, user_id, created_at)
SELECT l.project_id, f.image_url, l.user_id, l.created_at
FROM anthem.project_likes l
JOIN first_image f ON f.project_id = l.project_id
JOIN auth.users u ON u.id = l.user_id
WHERE f.image_url IS NOT NULL
  AND char_length(f.image_url) BETWEEN 8 AND 2048
  AND NOT EXISTS (
    SELECT 1 FROM anthem.project_image_likes x
    WHERE x.project_id = l.project_id AND x.user_id = l.user_id
  )
ON CONFLICT DO NOTHING;

-- 2. Smile on a comment ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS anthem.project_comment_smiles (
  comment_id uuid NOT NULL REFERENCES anthem.project_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_comment_smiles_user_idx
  ON anthem.project_comment_smiles (user_id);

ALTER TABLE anthem.project_comment_smiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_comment_smiles_read ON anthem.project_comment_smiles;
CREATE POLICY project_comment_smiles_read ON anthem.project_comment_smiles
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS project_comment_smiles_insert_own ON anthem.project_comment_smiles;
CREATE POLICY project_comment_smiles_insert_own ON anthem.project_comment_smiles
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS project_comment_smiles_delete_own ON anthem.project_comment_smiles;
CREATE POLICY project_comment_smiles_delete_own ON anthem.project_comment_smiles
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON anthem.project_comment_smiles FROM anon, authenticated;
GRANT SELECT ON anthem.project_comment_smiles TO anon, authenticated;
GRANT INSERT, DELETE ON anthem.project_comment_smiles TO authenticated;
