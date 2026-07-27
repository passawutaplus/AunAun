-- Add value-for-money category to work reviews
-- Solo-Code/supabase/migrations/20260724190000_work_review_rating_value.sql

ALTER TABLE anthem.work_reviews
  ADD COLUMN IF NOT EXISTS rating_value smallint
    CHECK (rating_value IS NULL OR rating_value BETWEEN 1 AND 5);

COMMENT ON COLUMN anthem.work_reviews.rating_value IS 'ความคุ้มค่า (1–5)';

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
       OR NEW.rating_value IS DISTINCT FROM OLD.rating_value
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
