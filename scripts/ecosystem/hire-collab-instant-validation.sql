-- Instant hire/collab: relax freelancer 1:1 hire validation (keep studio hire strict)
-- Run after jobs-2.sql on unified Supabase project

CREATE OR REPLACE FUNCTION anthem.enforce_hiring_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO anthem, public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM NEW.client_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF coalesce(NEW.target_type, 'freelancer') = 'studio' THEN
    IF btrim(coalesce(NEW.message, '')) = '' OR char_length(btrim(NEW.message)) < 20 THEN
      RAISE EXCEPTION 'INVALID_HIRE_MESSAGE';
    END IF;
    IF NEW.budget_amount IS NULL AND (NEW.deadline IS NULL OR btrim(NEW.deadline::text) = '') THEN
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
