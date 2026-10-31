-- package_public_stats now also returns total views (signed-in + guest) for the "วิวมากสุด" sort.
DROP FUNCTION IF EXISTS anthem.package_public_stats(uuid[]);
CREATE FUNCTION anthem.package_public_stats(p_service_ids uuid[])
RETURNS TABLE (service_id uuid, hires integer, views integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
  SELECT s.id,
    COALESCE((SELECT count(*) FROM anthem.hiring_requests r
              WHERE r.service_id = s.id AND r.status::text IN ('ตอบรับ', 'ปิดแล้ว')), 0)::integer,
    (COALESCE((SELECT count(*) FROM anthem.creator_service_views v WHERE v.service_id = s.id), 0)
     + COALESCE((SELECT count(*) FROM anthem.creator_service_anon_views a WHERE a.service_id = s.id), 0))::integer
  FROM unnest(p_service_ids) AS s(id)
  WHERE array_length(p_service_ids, 1) <= 200;
$$;
REVOKE ALL ON FUNCTION anthem.package_public_stats(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.package_public_stats(uuid[]) TO anon, authenticated;
