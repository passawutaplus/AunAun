-- If A blocks B, B cannot hire or collab A until unblocked.

CREATE OR REPLACE FUNCTION anthem.is_blocked_from_opportunity(_actor uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO anthem, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM anthem.user_blocks b
    WHERE b.blocker_id = _target
      AND b.blocked_id = _actor
  );
$$;

REVOKE ALL ON FUNCTION anthem.is_blocked_from_opportunity(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.is_blocked_from_opportunity(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION anthem.enforce_hiring_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO anthem, public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM NEW.client_id THEN
    IF NEW.forwarded_from_request_id IS NULL THEN
      RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;
    IF NOT anthem.is_hiring_request_freelancer(NEW.forwarded_from_request_id, auth.uid()) THEN
      RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;
  END IF;

  IF NEW.freelancer_id IS NOT NULL
     AND NEW.client_id IS NOT NULL
     AND anthem.is_blocked_from_opportunity(NEW.client_id, NEW.freelancer_id) THEN
    RAISE EXCEPTION 'USER_BLOCKED';
  END IF;

  IF coalesce(NEW.target_type, 'freelancer') = 'studio' THEN
    IF btrim(coalesce(NEW.message, '')) = '' OR char_length(btrim(NEW.message)) < 20 THEN
      RAISE EXCEPTION 'INVALID_HIRE_MESSAGE';
    END IF;
    IF NEW.budget_amount IS NULL
      AND NEW.budget_min IS NULL
      AND NEW.budget_max IS NULL
      AND (NEW.deadline IS NULL OR btrim(NEW.deadline::text) = '') THEN
      RAISE EXCEPTION 'INVALID_HIRE_BUDGET_OR_DEADLINE';
    END IF;
  ELSE
    IF NEW.message IS NOT NULL AND char_length(btrim(NEW.message)) > 1000 THEN
      RAISE EXCEPTION 'INVALID_HIRE_MESSAGE';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION anthem.enforce_collab_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO anthem, public
AS $$
BEGIN
  IF NEW.sender_id IS NOT NULL
     AND NEW.recipient_id IS NOT NULL
     AND anthem.is_blocked_from_opportunity(NEW.sender_id, NEW.recipient_id) THEN
    RAISE EXCEPTION 'USER_BLOCKED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collab_requests_enforce_insert ON anthem.collab_requests;
CREATE TRIGGER trg_collab_requests_enforce_insert
  BEFORE INSERT ON anthem.collab_requests
  FOR EACH ROW EXECUTE FUNCTION anthem.enforce_collab_request_insert();
