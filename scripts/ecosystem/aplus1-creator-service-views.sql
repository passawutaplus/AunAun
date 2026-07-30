-- Package analytics: views + hire linkage
-- Owners can read views on their services; viewers insert/update own rows.

CREATE TABLE IF NOT EXISTS anthem.creator_service_views (
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES anthem.creator_services(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (viewer_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_service_views_service_viewed
  ON anthem.creator_service_views (service_id, viewed_at DESC);

ALTER TABLE anthem.creator_service_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creator_service_views_select ON anthem.creator_service_views;
CREATE POLICY creator_service_views_select ON anthem.creator_service_views
  FOR SELECT TO authenticated
  USING (
    viewer_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM anthem.creator_services s
      WHERE s.id = service_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS creator_service_views_insert ON anthem.creator_service_views;
CREATE POLICY creator_service_views_insert ON anthem.creator_service_views
  FOR INSERT TO authenticated
  WITH CHECK (viewer_id = auth.uid());

DROP POLICY IF EXISTS creator_service_views_update ON anthem.creator_service_views;
CREATE POLICY creator_service_views_update ON anthem.creator_service_views
  FOR UPDATE TO authenticated
  USING (viewer_id = auth.uid())
  WITH CHECK (viewer_id = auth.uid());

DROP POLICY IF EXISTS creator_service_views_delete ON anthem.creator_service_views;
CREATE POLICY creator_service_views_delete ON anthem.creator_service_views
  FOR DELETE TO authenticated
  USING (viewer_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.creator_service_views TO authenticated;

-- Link hire requests to the package that started them
ALTER TABLE anthem.hiring_requests
  ADD COLUMN IF NOT EXISTS service_id uuid;

CREATE INDEX IF NOT EXISTS idx_hiring_requests_service_id
  ON anthem.hiring_requests (service_id)
  WHERE service_id IS NOT NULL;

COMMENT ON COLUMN anthem.hiring_requests.service_id IS
  'Creator package (creator_services) that originated this hire request, if any';
