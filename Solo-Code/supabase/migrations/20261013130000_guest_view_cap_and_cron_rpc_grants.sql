-- 1) Guest package views: cap per package per hour.
--    record_service_view_anon accepts any random browser id, so a script could add one "view" per call and
--    climb the "วิวมากสุด" sort. Guest views now count at most 30 new viewers per package per rolling hour;
--    anything above that is dropped silently (signed-in views are unaffected).
CREATE INDEX IF NOT EXISTS creator_service_anon_views_service_time_idx
  ON anthem.creator_service_anon_views (service_id, viewed_at DESC);

CREATE OR REPLACE FUNCTION anthem.record_service_view_anon(p_service_id uuid, p_anon_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
DECLARE
  guest_views_per_hour constant integer := 30;
BEGIN
  IF p_anon_id IS NULL OR char_length(p_anon_id) NOT BETWEEN 8 AND 64 THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM anthem.creator_services s WHERE s.id = p_service_id AND s.status = 'Published') THEN
    RETURN;
  END IF;
  IF (
    SELECT count(*) FROM anthem.creator_service_anon_views v
    WHERE v.service_id = p_service_id AND v.viewed_at > now() - interval '1 hour'
  ) >= guest_views_per_hour THEN
    RETURN;
  END IF;
  INSERT INTO anthem.creator_service_anon_views (anon_id, service_id)
  VALUES (p_anon_id, p_service_id)
  ON CONFLICT (anon_id, service_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION anthem.record_service_view_anon(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.record_service_view_anon(uuid, text) TO anon, authenticated;

-- 2) Expiry sweeps are not for signed-out callers.
--    pg_cron is not installed, so signed-in clients trigger these lazily (useHireCancelRequest,
--    useCollabEndRequest, useJobs) — authenticated keeps EXECUTE. Nothing calls expire_post_boosts from a
--    client, so it is service-role only.
REVOKE EXECUTE ON FUNCTION public.finalize_expired_hire_cancel_requests() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalize_expired_collab_end_requests() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.expire_pending_job_applications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_expired_hire_cancel_requests() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_expired_collab_end_requests() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_pending_job_applications() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.expire_post_boosts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_post_boosts() TO service_role;
