-- Aplus1 work reviews (hire + collab) — 1–5 stars
-- Canonical: Solo-Code/supabase/migrations/20260724160000_work_reviews.sql
-- Apply: cp to Solo-Code/supabase/migrations/ then ./scripts/supabase-push-via-api.sh

CREATE TABLE IF NOT EXISTS anthem.work_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('hire', 'collab')),
  subject_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hire_request_id uuid REFERENCES anthem.hiring_requests(id) ON DELETE CASCADE,
  collab_request_id uuid REFERENCES anthem.collab_requests(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  tags text[] NOT NULL DEFAULT '{}'::text[],
  body text CHECK (body IS NULL OR char_length(trim(body)) BETWEEN 1 AND 500),
  project_id uuid,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_reviews_no_self CHECK (subject_user_id <> author_user_id),
  CONSTRAINT work_reviews_ref_chk CHECK (
    (kind = 'hire' AND hire_request_id IS NOT NULL AND collab_request_id IS NULL)
    OR (kind = 'collab' AND collab_request_id IS NOT NULL AND hire_request_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS work_reviews_hire_author_uidx
  ON anthem.work_reviews (hire_request_id, author_user_id)
  WHERE hire_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS work_reviews_collab_author_uidx
  ON anthem.work_reviews (collab_request_id, author_user_id)
  WHERE collab_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_reviews_subject
  ON anthem.work_reviews (subject_user_id, kind, created_at DESC)
  WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_work_reviews_author
  ON anthem.work_reviews (author_user_id, created_at DESC);

COMMENT ON TABLE anthem.work_reviews IS
  'Public work reviews after hire/collab completion — rating 1–5';

CREATE OR REPLACE FUNCTION anthem.can_submit_work_review(
  p_kind text,
  p_author uuid,
  p_subject uuid,
  p_hire_id uuid,
  p_collab_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  hr anthem.hiring_requests%ROWTYPE;
  cr anthem.collab_requests%ROWTYPE;
BEGIN
  IF p_author IS NULL OR p_subject IS NULL OR p_author = p_subject THEN
    RETURN false;
  END IF;

  IF p_kind = 'hire' THEN
    IF p_hire_id IS NULL THEN RETURN false; END IF;
    SELECT * INTO hr FROM anthem.hiring_requests WHERE id = p_hire_id;
    IF NOT FOUND THEN RETURN false; END IF;
    IF hr.status IS DISTINCT FROM 'ปิดแล้ว' THEN RETURN false; END IF;
    IF p_author = hr.client_id AND p_subject = hr.freelancer_id THEN RETURN true; END IF;
    IF p_author = hr.freelancer_id AND p_subject = hr.client_id THEN RETURN true; END IF;
    RETURN false;
  END IF;

  IF p_kind = 'collab' THEN
    IF p_collab_id IS NULL THEN RETURN false; END IF;
    SELECT * INTO cr FROM anthem.collab_requests WHERE id = p_collab_id;
    IF NOT FOUND THEN RETURN false; END IF;
    IF cr.status NOT IN ('completed', 'archived') THEN RETURN false; END IF;
    IF p_author = cr.sender_id AND p_subject = cr.recipient_id THEN RETURN true; END IF;
    IF p_author = cr.recipient_id AND p_subject = cr.sender_id THEN RETURN true; END IF;
    RETURN false;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION anthem.can_submit_work_review(text, uuid, uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.can_submit_work_review(text, uuid, uuid, uuid, uuid) TO authenticated;

ALTER TABLE anthem.work_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_reviews_select_public" ON anthem.work_reviews;
CREATE POLICY "work_reviews_select_public"
  ON anthem.work_reviews FOR SELECT TO authenticated, anon
  USING (
    visibility = 'public'
    OR author_user_id = auth.uid()
    OR subject_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "work_reviews_insert_party" ON anthem.work_reviews;
CREATE POLICY "work_reviews_insert_party"
  ON anthem.work_reviews FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND anthem.can_submit_work_review(
      kind, author_user_id, subject_user_id, hire_request_id, collab_request_id
    )
  );

DROP POLICY IF EXISTS "work_reviews_update_author" ON anthem.work_reviews;
CREATE POLICY "work_reviews_update_author"
  ON anthem.work_reviews FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid() AND created_at > now() - interval '24 hours')
  WITH CHECK (author_user_id = auth.uid());

DROP POLICY IF EXISTS "work_reviews_delete_author" ON anthem.work_reviews;
CREATE POLICY "work_reviews_delete_author"
  ON anthem.work_reviews FOR DELETE TO authenticated
  USING (author_user_id = auth.uid() AND created_at > now() - interval '24 hours');

GRANT SELECT ON anthem.work_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON anthem.work_reviews TO authenticated;
