-- Phase E: public changelog (anthem.release_notes) + win-back ("churn") email bookkeeping.
-- (public.changelog_entries belongs to So1o — SAMECOR gets its own table.)

-- 1) Release notes ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anthem.release_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 140),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 4000),
  tag text NOT NULL DEFAULT 'new' CHECK (tag IN ('new', 'improved', 'fixed')),
  -- Feedback this release answers; publishing marks them `adopted` (which notifies each sender)
  feedback_ids uuid[] NOT NULL DEFAULT '{}',
  published_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS release_notes_published_idx
  ON anthem.release_notes (published_at DESC) WHERE published_at IS NOT NULL;

ALTER TABLE anthem.release_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "release notes public read" ON anthem.release_notes;
CREATE POLICY "release notes public read" ON anthem.release_notes
  FOR SELECT USING (
    (published_at IS NOT NULL AND published_at <= now())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "release notes admin write" ON anthem.release_notes;
CREATE POLICY "release notes admin write" ON anthem.release_notes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON anthem.release_notes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON anthem.release_notes TO authenticated;
GRANT ALL ON anthem.release_notes TO service_role;

CREATE OR REPLACE FUNCTION anthem.release_notes_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anthem', 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.published_at IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.published_at IS NULL)
     AND cardinality(NEW.feedback_ids) > 0 THEN
    UPDATE anthem.app_feedback
       SET status = 'adopted', resolved_at = now(), resolved_by = auth.uid()
     WHERE id = ANY (NEW.feedback_ids)
       AND status IS DISTINCT FROM 'adopted';
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION anthem.release_notes_on_publish() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_release_notes_publish ON anthem.release_notes;
CREATE TRIGGER trg_release_notes_publish
  BEFORE INSERT OR UPDATE ON anthem.release_notes
  FOR EACH ROW EXECUTE FUNCTION anthem.release_notes_on_publish();

-- 2) Win-back email ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS anthem.churn_email_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  days_inactive int NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS churn_email_log_user_idx ON anthem.churn_email_log (user_id, sent_at DESC);
ALTER TABLE anthem.churn_email_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON anthem.churn_email_log FROM anon, authenticated;
GRANT ALL ON anthem.churn_email_log TO service_role;

/**
 * People quiet for _min_days.._max_days who allow email and had no win-back email in the last 45 days.
 * "Last seen" = newest of sign-in, session refresh and product events (a long-lived session never re-signs in).
 */
CREATE OR REPLACE FUNCTION anthem.churn_candidates(
  _min_days int DEFAULT 14,
  _max_days int DEFAULT 90,
  _limit int DEFAULT 50
)
RETURNS TABLE (user_id uuid, email text, display_name text, last_seen timestamptz, days_inactive int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'anthem', 'public', 'auth'
AS $$
  WITH seen AS (
    SELECT u.id,
           u.email,
           GREATEST(
             u.last_sign_in_at,
             (SELECT max(s.updated_at) FROM auth.sessions s WHERE s.user_id = u.id),
             (SELECT max(e.created_at) FROM public.product_events e WHERE e.user_id = u.id)
           ) AS last_seen
      FROM auth.users u
     WHERE u.email IS NOT NULL
       AND u.email_confirmed_at IS NOT NULL
       AND u.deleted_at IS NULL
       AND u.created_at < now() - make_interval(days => _min_days)
  )
  SELECT s.id, s.email, p.display_name, s.last_seen,
         floor(extract(epoch FROM now() - s.last_seen) / 86400)::int
    FROM seen s
    LEFT JOIN public.profiles p ON p.user_id = s.id
   WHERE s.last_seen IS NOT NULL
     AND s.last_seen < now() - make_interval(days => _min_days)
     AND s.last_seen > now() - make_interval(days => _max_days)
     AND COALESCE(p.notify_email, true)
     AND NOT EXISTS (
       SELECT 1 FROM anthem.churn_email_log l
        WHERE l.user_id = s.id AND l.sent_at > now() - interval '45 days'
     )
   ORDER BY s.last_seen DESC
   LIMIT LEAST(GREATEST(_limit, 1), 200);
$$;

REVOKE EXECUTE ON FUNCTION anthem.churn_candidates(int, int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION anthem.churn_candidates(int, int, int) TO service_role;
