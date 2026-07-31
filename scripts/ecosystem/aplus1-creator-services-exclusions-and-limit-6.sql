-- Package exclusions note + raise package limit 5 → 6
ALTER TABLE anthem.creator_services
  ADD COLUMN IF NOT EXISTS exclusions_note text NOT NULL DEFAULT '';

COMMENT ON COLUMN anthem.creator_services.exclusions_note IS
  'Optional package exclusions (สิ่งที่ไม่รวม) shown on package detail.';

CREATE OR REPLACE FUNCTION anthem.enforce_creator_services_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'anthem', 'public'
AS $function$
DECLARE
  n int;
BEGIN
  SELECT count(*)::int INTO n
  FROM anthem.creator_services
  WHERE owner_id = NEW.owner_id;

  IF n >= 6 THEN
    RAISE EXCEPTION 'SERVICE_LIMIT: ลงได้สูงสุด 6 บริการ';
  END IF;
  RETURN NEW;
END;
$function$;
