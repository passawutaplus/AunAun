-- Security / UX hardening from production review (2026-06-29)

-- anthem.projects: owner-only writes, published public read
DO $proj$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'anthem' AND table_name = 'projects'
  ) THEN
    ALTER TABLE anthem.projects ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Published projects are public" ON anthem.projects;
    CREATE POLICY "Published projects are public"
      ON anthem.projects FOR SELECT
      USING (status = 'Published');

    DROP POLICY IF EXISTS "Owners view own projects" ON anthem.projects;
    CREATE POLICY "Owners view own projects"
      ON anthem.projects FOR SELECT TO authenticated
      USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

    DROP POLICY IF EXISTS "Owners insert own projects" ON anthem.projects;
    CREATE POLICY "Owners insert own projects"
      ON anthem.projects FOR INSERT TO authenticated
      WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

    DROP POLICY IF EXISTS "Owners update own projects" ON anthem.projects;
    CREATE POLICY "Owners update own projects"
      ON anthem.projects FOR UPDATE TO authenticated
      USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

    DROP POLICY IF EXISTS "Owners delete own projects" ON anthem.projects;
    CREATE POLICY "Owners delete own projects"
      ON anthem.projects FOR DELETE TO authenticated
      USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $proj$;

DROP POLICY IF EXISTS "Admins view all conversations" ON shared.conversations;
CREATE POLICY "Admins view all conversations"
  ON shared.conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DO $audit$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'shared' AND table_name = 'admin_audit_log'
  ) THEN
    ALTER TABLE shared.admin_audit_log ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins read audit log" ON shared.admin_audit_log;
    CREATE POLICY "Admins read audit log"
      ON shared.admin_audit_log FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
    DROP POLICY IF EXISTS "Admins insert audit log" ON shared.admin_audit_log;
    CREATE POLICY "Admins insert audit log"
      ON shared.admin_audit_log FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin') OR actor_id = auth.uid());
  END IF;
END $audit$;

CREATE OR REPLACE FUNCTION anthem.enforce_hiring_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = anthem, public
AS $$
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM NEW.client_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  IF btrim(coalesce(NEW.message, '')) = '' OR char_length(btrim(NEW.message)) < 20 THEN
    RAISE EXCEPTION 'INVALID_HIRE_MESSAGE';
  END IF;
  IF NEW.budget_amount IS NULL AND (NEW.deadline IS NULL OR btrim(NEW.deadline::text) = '') THEN
    RAISE EXCEPTION 'INVALID_HIRE_BUDGET_OR_DEADLINE';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hiring_requests_enforce_insert ON anthem.hiring_requests;
CREATE TRIGGER trg_hiring_requests_enforce_insert
  BEFORE INSERT ON anthem.hiring_requests
  FOR EACH ROW EXECUTE FUNCTION anthem.enforce_hiring_request_insert();
