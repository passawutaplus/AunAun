-- Category ratings for work reviews + overall average
-- Canonical: Solo-Code/supabase/migrations/20260724180000_work_review_category_ratings.sql

ALTER TABLE anthem.work_reviews
  ADD COLUMN IF NOT EXISTS rating_punctuality smallint
    CHECK (rating_punctuality IS NULL OR rating_punctuality BETWEEN 1 AND 5);

ALTER TABLE anthem.work_reviews
  ADD COLUMN IF NOT EXISTS rating_quality smallint
    CHECK (rating_quality IS NULL OR rating_quality BETWEEN 1 AND 5);

ALTER TABLE anthem.work_reviews
  ADD COLUMN IF NOT EXISTS rating_coop smallint
    CHECK (rating_coop IS NULL OR rating_coop BETWEEN 1 AND 5);

ALTER TABLE anthem.work_reviews
  ADD COLUMN IF NOT EXISTS rating_brief smallint
    CHECK (rating_brief IS NULL OR rating_brief BETWEEN 1 AND 5);

-- Overall may be half-star average (e.g. 4.5)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'anthem'
    AND rel.relname = 'work_reviews'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%rating%BETWEEN%'
    AND pg_get_constraintdef(con.oid) NOT ILIKE '%rating_punctuality%'
    AND pg_get_constraintdef(con.oid) NOT ILIKE '%rating_quality%'
    AND pg_get_constraintdef(con.oid) NOT ILIKE '%rating_coop%'
    AND pg_get_constraintdef(con.oid) NOT ILIKE '%rating_brief%'
    AND pg_get_constraintdef(con.oid) NOT ILIKE '%reply_body%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE anthem.work_reviews DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE anthem.work_reviews
  ALTER COLUMN rating TYPE numeric(3,2) USING rating::numeric(3,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'work_reviews_rating_range'
      AND conrelid = 'anthem.work_reviews'::regclass
  ) THEN
    ALTER TABLE anthem.work_reviews
      ADD CONSTRAINT work_reviews_rating_range
      CHECK (rating >= 1 AND rating <= 5);
  END IF;
END $$;

COMMENT ON COLUMN anthem.work_reviews.rating IS
  'Overall score — average of category ratings when set';
COMMENT ON COLUMN anthem.work_reviews.rating_punctuality IS 'ตรงเวลา (1–5)';
COMMENT ON COLUMN anthem.work_reviews.rating_quality IS 'คุณภาพผลงาน (1–5)';
COMMENT ON COLUMN anthem.work_reviews.rating_coop IS 'ให้ความร่วมมือ (1–5)';
COMMENT ON COLUMN anthem.work_reviews.rating_brief IS 'เข้าใจโจทย์และปัญหา (1–5)';

CREATE OR REPLACE FUNCTION anthem.work_reviews_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.subject_user_id IS DISTINCT FROM OLD.subject_user_id
     OR NEW.author_user_id IS DISTINCT FROM OLD.author_user_id
     OR NEW.hire_request_id IS DISTINCT FROM OLD.hire_request_id
     OR NEW.collab_request_id IS DISTINCT FROM OLD.collab_request_id
  THEN
    RAISE EXCEPTION 'INVALID: cannot change review identity';
  END IF;

  IF auth.uid() = OLD.subject_user_id AND auth.uid() IS DISTINCT FROM OLD.author_user_id THEN
    IF NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.rating_punctuality IS DISTINCT FROM OLD.rating_punctuality
       OR NEW.rating_quality IS DISTINCT FROM OLD.rating_quality
       OR NEW.rating_coop IS DISTINCT FROM OLD.rating_coop
       OR NEW.rating_brief IS DISTINCT FROM OLD.rating_brief
       OR NEW.tags IS DISTINCT FROM OLD.tags
       OR NEW.body IS DISTINCT FROM OLD.body
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.visibility IS DISTINCT FROM OLD.visibility
    THEN
      RAISE EXCEPTION 'INVALID: subject can only reply';
    END IF;
    IF NEW.reply_body IS DISTINCT FROM OLD.reply_body THEN
      NEW.reply_at := CASE WHEN NEW.reply_body IS NULL THEN NULL ELSE now() END;
    ELSE
      NEW.reply_at := OLD.reply_at;
    END IF;
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.author_user_id THEN
    NEW.reply_body := OLD.reply_body;
    NEW.reply_at := OLD.reply_at;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'FORBIDDEN: cannot update this review';
END;
$$;
