-- Packages upgrade: tiers / add-ons / FAQ on a package, guest view counts, real hire counts,
-- save counts for owners and a creator response-time figure.

-- 1) Package content ---------------------------------------------------------------------------
ALTER TABLE anthem.creator_services
  ADD COLUMN IF NOT EXISTS tiers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS addons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faq jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE anthem.creator_services
  DROP CONSTRAINT IF EXISTS creator_services_tiers_shape,
  ADD CONSTRAINT creator_services_tiers_shape CHECK (jsonb_typeof(tiers) = 'array' AND jsonb_array_length(tiers) <= 3),
  DROP CONSTRAINT IF EXISTS creator_services_addons_shape,
  ADD CONSTRAINT creator_services_addons_shape CHECK (jsonb_typeof(addons) = 'array' AND jsonb_array_length(addons) <= 6),
  DROP CONSTRAINT IF EXISTS creator_services_faq_shape,
  ADD CONSTRAINT creator_services_faq_shape CHECK (jsonb_typeof(faq) = 'array' AND jsonb_array_length(faq) <= 8);

-- 2) Guest views ----------------------------------------------------------------------------------
-- Signed-in views stay in creator_service_views (one row per viewer). Guests get a random browser id.
CREATE TABLE IF NOT EXISTS anthem.creator_service_anon_views (
  anon_id text NOT NULL CHECK (char_length(anon_id) BETWEEN 8 AND 64),
  service_id uuid NOT NULL REFERENCES anthem.creator_services (id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (anon_id, service_id)
);
ALTER TABLE anthem.creator_service_anon_views ENABLE ROW LEVEL SECURITY;
-- No direct access; owners read counts through package_owner_stats().

CREATE OR REPLACE FUNCTION anthem.record_service_view_anon(p_service_id uuid, p_anon_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anthem, public
AS $$
BEGIN
  IF p_anon_id IS NULL OR char_length(p_anon_id) NOT BETWEEN 8 AND 64 THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM anthem.creator_services s WHERE s.id = p_service_id AND s.status = 'Published') THEN
    RETURN;
  END IF;
  INSERT INTO anthem.creator_service_anon_views (anon_id, service_id)
  VALUES (p_anon_id, p_service_id)
  ON CONFLICT (anon_id, service_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION anthem.record_service_view_anon(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.record_service_view_anon(uuid, text) TO anon, authenticated;

-- 3) Public numbers per package: real hires (accepted / closed) ------------------------------------
CREATE OR REPLACE FUNCTION anthem.package_public_stats(p_service_ids uuid[])
RETURNS TABLE (service_id uuid, hires integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
  SELECT s.id, COALESCE(h.n, 0)::integer
  FROM unnest(p_service_ids) AS s(id)
  LEFT JOIN (
    SELECT r.service_id, count(*) AS n
    FROM anthem.hiring_requests r
    WHERE r.service_id = ANY (p_service_ids)
      AND r.status::text IN ('ตอบรับ', 'ปิดแล้ว')
    GROUP BY r.service_id
  ) h ON h.service_id = s.id
  WHERE array_length(p_service_ids, 1) <= 200;
$$;
REVOKE ALL ON FUNCTION anthem.package_public_stats(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.package_public_stats(uuid[]) TO anon, authenticated;

-- 4) Owner-only numbers: saves and guest views for the caller's own packages ------------------------
CREATE OR REPLACE FUNCTION anthem.package_owner_stats()
RETURNS TABLE (service_id uuid, saves integer, guest_views integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, public
AS $$
  SELECT s.id,
    (SELECT count(*) FROM anthem.creator_service_bookmarks b WHERE b.service_id = s.id)::integer,
    (SELECT count(*) FROM anthem.creator_service_anon_views v WHERE v.service_id = s.id)::integer
  FROM anthem.creator_services s
  WHERE s.owner_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION anthem.package_owner_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.package_owner_stats() TO authenticated;

-- 5) Typical first reply time of a creator in hire chats (minutes, median of the last 20) -----------
CREATE OR REPLACE FUNCTION anthem.creator_response_minutes(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = anthem, shared, public
AS $$
  WITH convs AS (
    SELECT c.id, c.client_id
    FROM shared.conversations c
    WHERE c.freelancer_id = p_user_id AND c.kind = 'hire'
    ORDER BY c.created_at DESC
    LIMIT 20
  ),
  firsts AS (
    SELECT
      (SELECT min(m.created_at) FROM shared.messages m WHERE m.conversation_id = cv.id AND m.sender_id = cv.client_id) AS asked,
      (SELECT min(m.created_at) FROM shared.messages m WHERE m.conversation_id = cv.id AND m.sender_id = p_user_id) AS replied
    FROM convs cv
  )
  SELECT CASE WHEN count(*) >= 3
    THEN (percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM (replied - asked)) / 60))::integer
    ELSE NULL END
  FROM firsts
  WHERE asked IS NOT NULL AND replied IS NOT NULL AND replied >= asked;
$$;
REVOKE ALL ON FUNCTION anthem.creator_response_minutes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION anthem.creator_response_minutes(uuid) TO anon, authenticated;
