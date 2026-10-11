-- Follow a tag or a tool from /explore: new published works that use it land in the shared inbox.

CREATE TABLE IF NOT EXISTS anthem.explore_follows (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('tag', 'tool')),
  -- Lower-cased tag (without #) or tool name, so matching is case-insensitive.
  value text NOT NULL CHECK (char_length(value) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, value)
);

CREATE INDEX IF NOT EXISTS explore_follows_kind_value_idx ON anthem.explore_follows (kind, value);

ALTER TABLE anthem.explore_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS explore_follows_own ON anthem.explore_follows;
CREATE POLICY explore_follows_own ON anthem.explore_follows
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON anthem.explore_follows TO authenticated;

-- When a work becomes Published, tell followers of any of its tags / tools (once per follower).
CREATE OR REPLACE FUNCTION anthem.notify_explore_followers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'Published' OR (TG_OP = 'UPDATE' AND OLD.status = 'Published') THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO shared.notifications (user_id, app, kind, title, body, link, metadata)
    SELECT DISTINCT ON (f.user_id)
      f.user_id,
      'anthem',
      'explore_follow',
      CASE WHEN f.kind = 'tag' THEN 'ผลงานใหม่ในแท็ก #' || f.value ELSE 'ผลงานใหม่ที่ใช้ ' || f.value END,
      NEW.title,
      '/project/' || NEW.id::text,
      jsonb_build_object('project_id', NEW.id, 'kind', f.kind, 'value', f.value)
    FROM anthem.explore_follows f
    WHERE f.user_id <> NEW.owner_id
      AND (
        (f.kind = 'tag' AND f.value = ANY (SELECT lower(trim(both '#' from t)) FROM unnest(COALESCE(NEW.tags, '{}')) t))
        OR (f.kind = 'tool' AND f.value = ANY (SELECT lower(t) FROM unnest(COALESCE(NEW.tools, '{}')) t))
      )
    ORDER BY f.user_id, f.kind;
  EXCEPTION WHEN OTHERS THEN
    -- Never block publishing because of a notification problem.
    RAISE WARNING 'notify_explore_followers failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION anthem.notify_explore_followers() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_notify_explore_followers ON anthem.projects;
CREATE TRIGGER trg_notify_explore_followers
  AFTER INSERT OR UPDATE OF status ON anthem.projects
  FOR EACH ROW EXECUTE FUNCTION anthem.notify_explore_followers();
