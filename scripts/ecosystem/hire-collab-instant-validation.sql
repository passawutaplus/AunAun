-- Instant hire/collab: relax freelancer 1:1 hire validation (keep studio hire strict)
-- Run after jobs-2.sql on unified Supabase project
-- Updated: allow original freelancer to forward a request to another creator

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
