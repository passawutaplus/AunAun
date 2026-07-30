-- Admin ops for creator packages + analytics visibility
-- Depends on: anthem.creator_services, anthem.creator_service_views, hiring_requests.service_id

-- Admin can read all packages (including Draft)
DROP POLICY IF EXISTS creator_services_admin_select ON anthem.creator_services;
CREATE POLICY creator_services_admin_select ON anthem.creator_services
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS creator_services_admin_update ON anthem.creator_services;
CREATE POLICY creator_services_admin_update ON anthem.creator_services
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS creator_services_admin_delete ON anthem.creator_services;
CREATE POLICY creator_services_admin_delete ON anthem.creator_services
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can read package view analytics
DROP POLICY IF EXISTS creator_service_views_admin_select ON anthem.creator_service_views;
CREATE POLICY creator_service_views_admin_select ON anthem.creator_service_views
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Soft FK for hire ↔ package (nullable; ignore orphans)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'hiring_requests_service_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE anthem.hiring_requests
        ADD CONSTRAINT hiring_requests_service_id_fkey
        FOREIGN KEY (service_id)
        REFERENCES anthem.creator_services(id)
        ON DELETE SET NULL;
    EXCEPTION WHEN others THEN
      -- Skip if orphan rows block FK; column still usable for analytics.
      RAISE NOTICE 'skip hiring_requests_service_id_fkey: %', SQLERRM;
    END;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_creator_service(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'anthem'
AS $$
DECLARE
  _deleted int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;

  -- Views cascade; clear hire link
  UPDATE anthem.hiring_requests SET service_id = NULL WHERE service_id = _id;
  DELETE FROM anthem.creator_service_views WHERE service_id = _id;
  DELETE FROM anthem.creator_services WHERE id = _id;
  GET DIAGNOSTICS _deleted = ROW_COUNT;

  IF _deleted = 0 THEN
    RAISE EXCEPTION 'ไม่พบแพ็กเกจ';
  END IF;

  PERFORM public.log_admin_audit('creator_service.delete', 'creator_service', _id::text, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_creator_service_status(_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'anthem'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;
  IF _status NOT IN ('Draft', 'Published') THEN
    RAISE EXCEPTION 'สถานะไม่ถูกต้อง';
  END IF;

  UPDATE anthem.creator_services
  SET status = _status, updated_at = now()
  WHERE id = _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบแพ็กเกจ';
  END IF;

  PERFORM public.log_admin_audit(
    'creator_service.set_status',
    'creator_service',
    _id::text,
    jsonb_build_object('status', _status)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_creator_service(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_creator_service_status(uuid, text) TO authenticated;
