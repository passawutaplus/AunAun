-- Review fixes (2026-10-07)
-- 1) forum_attachments: authors could UPDATE their own row, including scan_status,
--    and mark an unscanned/blocked file as 'clean' (bypassing the virus-scan gate).
-- 2) projects: owners could UPDATE views / likes directly (counter inflation).
-- Only service_role (scanner / server jobs) and admins may change these columns.

CREATE OR REPLACE FUNCTION anthem.guard_forum_attachment_scan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.scan_status IS DISTINCT FROM OLD.scan_status
     OR NEW.scan_reason IS DISTINCT FROM OLD.scan_reason
     OR NEW.scanned_at IS DISTINCT FROM OLD.scanned_at
     OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
     OR NEW.public_url IS DISTINCT FROM OLD.public_url
     OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
     OR NEW.mime_type IS DISTINCT FROM OLD.mime_type THEN
    RAISE EXCEPTION 'forum_attachments: scan / file fields are server-managed'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_forum_attachment_scan ON anthem.forum_attachments;
CREATE TRIGGER trg_guard_forum_attachment_scan
  BEFORE UPDATE ON anthem.forum_attachments
  FOR EACH ROW EXECUTE FUNCTION anthem.guard_forum_attachment_scan();

-- New rows always start as pending, whatever the client sends.
CREATE OR REPLACE FUNCTION anthem.force_forum_attachment_pending()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, anthem
AS $$
BEGIN
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    NEW.scan_status := 'pending';
    NEW.scan_reason := NULL;
    NEW.scanned_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_forum_attachment_pending ON anthem.forum_attachments;
CREATE TRIGGER trg_force_forum_attachment_pending
  BEFORE INSERT ON anthem.forum_attachments
  FOR EACH ROW EXECUTE FUNCTION anthem.force_forum_attachment_pending();

-- Project counters are maintained by server-side functions only.
CREATE OR REPLACE FUNCTION anthem.guard_project_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, anthem
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;
  -- Counter RPCs run as SECURITY DEFINER (owner = postgres), so allow those too.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  NEW.views := OLD.views;
  NEW.likes := OLD.likes;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_project_counters ON anthem.projects;
CREATE TRIGGER trg_guard_project_counters
  BEFORE UPDATE ON anthem.projects
  FOR EACH ROW EXECUTE FUNCTION anthem.guard_project_counters();
