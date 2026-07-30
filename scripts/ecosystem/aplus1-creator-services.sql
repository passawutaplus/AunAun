-- Creator Services (Dribbble-style packages on profile)
-- Max 5 services per creator. Chat can attach service_id like project_id.
-- Related:
--   scripts/ecosystem/aplus1-creator-service-views.sql  (views + hire.service_id)
--   scripts/ecosystem/aplus1-creator-services-admin.sql  (admin RLS + RPCs)

CREATE TABLE IF NOT EXISTS anthem.creator_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  price_thb integer NOT NULL CHECK (price_thb >= 0),
  summary text NOT NULL DEFAULT '',
  deliverables text[] NOT NULL DEFAULT '{}',
  duration_label text NOT NULL DEFAULT '',
  concepts_label text NOT NULL DEFAULT '',
  revisions_label text NOT NULL DEFAULT '',
  cover_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  price_min_thb integer NOT NULL DEFAULT 0 CHECK (price_min_thb >= 0),
  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Published')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_services_owner
  ON anthem.creator_services (owner_id, sort_order, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creator_services_owner_published
  ON anthem.creator_services (owner_id)
  WHERE status = 'Published';

CREATE OR REPLACE FUNCTION anthem.enforce_creator_services_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'anthem', 'public'
AS $$
DECLARE
  n int;
BEGIN
  -- NEW row is not visible yet on INSERT
  SELECT count(*)::int INTO n
  FROM anthem.creator_services
  WHERE owner_id = NEW.owner_id;

  IF n >= 5 THEN
    RAISE EXCEPTION 'SERVICE_LIMIT: ลงได้สูงสุด 5 บริการ';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creator_services_limit ON anthem.creator_services;
CREATE TRIGGER trg_creator_services_limit
  BEFORE INSERT ON anthem.creator_services
  FOR EACH ROW
  EXECUTE FUNCTION anthem.enforce_creator_services_limit();

CREATE OR REPLACE FUNCTION anthem.set_creator_services_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creator_services_updated_at ON anthem.creator_services;
CREATE TRIGGER trg_creator_services_updated_at
  BEFORE UPDATE ON anthem.creator_services
  FOR EACH ROW
  EXECUTE FUNCTION anthem.set_creator_services_updated_at();

ALTER TABLE anthem.creator_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creator_services_select ON anthem.creator_services;
CREATE POLICY creator_services_select ON anthem.creator_services
  FOR SELECT TO anon, authenticated
  USING (status = 'Published' OR owner_id = auth.uid());

DROP POLICY IF EXISTS creator_services_insert ON anthem.creator_services;
CREATE POLICY creator_services_insert ON anthem.creator_services
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS creator_services_update ON anthem.creator_services;
CREATE POLICY creator_services_update ON anthem.creator_services
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS creator_services_delete ON anthem.creator_services;
CREATE POLICY creator_services_delete ON anthem.creator_services
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.creator_services TO authenticated;
GRANT SELECT ON anthem.creator_services TO anon;

-- Optional chat attachment for service context
ALTER TABLE shared.conversations
  ADD COLUMN IF NOT EXISTS service_id uuid;

ALTER TABLE shared.messages
  ADD COLUMN IF NOT EXISTS service_id uuid;

CREATE INDEX IF NOT EXISTS idx_conversations_service_id
  ON shared.conversations (service_id)
  WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_service_id
  ON shared.messages (service_id)
  WHERE service_id IS NOT NULL;
