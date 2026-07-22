-- Soft server guard: cannot keep allow_hire=true unless seller is_verified.
-- Full checklist (billing/bank/email) is enforced in ProjectEditor UI + save clamp.
-- Safe to re-run.

CREATE OR REPLACE FUNCTION anthem.enforce_project_allow_hire_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public, shared
AS $$
DECLARE
  verified boolean := false;
BEGIN
  IF NEW.allow_hire IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.is_verified, false)
  INTO verified
  FROM public.profiles p
  WHERE p.user_id = NEW.owner_id
  LIMIT 1;

  IF NOT COALESCE(verified, false) THEN
    NEW.allow_hire := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_project_allow_hire_verified ON anthem.projects;
CREATE TRIGGER trg_enforce_project_allow_hire_verified
  BEFORE INSERT OR UPDATE OF allow_hire, owner_id
  ON anthem.projects
  FOR EACH ROW
  EXECUTE FUNCTION anthem.enforce_project_allow_hire_verified();

COMMENT ON FUNCTION anthem.enforce_project_allow_hire_verified() IS
  'Clamp allow_hire to false when project owner is not KYC-verified (is_verified).';
