-- Objects: pieces artists and designers sell (objects, art toys, prints, files).
-- Separate from creator_services (packages / hired work).
-- Apply on the Aplus1 database before listings can be saved.

CREATE TABLE IF NOT EXISTS anthem.creator_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  code text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  story text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('texts', 'prints', 'made', 'art-toy', 'files')),
  subtype text NOT NULL DEFAULT '',
  material text NOT NULL DEFAULT '',
  fulfillment text NOT NULL DEFAULT 'ready'
    CHECK (fulfillment IN ('ready', 'made_to_order', 'preorder', 'download')),
  edition text NOT NULL DEFAULT 'open'
    CHECK (edition IN ('open', 'limited', 'unique')),
  edition_label text NOT NULL DEFAULT '',
  price_thb integer NOT NULL CHECK (price_thb >= 0),
  lead_time text NOT NULL DEFAULT '',
  cover_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  finishes jsonb NOT NULL DEFAULT '[]'::jsonb,
  specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  downloads jsonb NOT NULL DEFAULT '[]'::jsonb,
  license_note text NOT NULL DEFAULT '',
  reference_project_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Published', 'Paused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anthem.creator_objects DROP CONSTRAINT IF EXISTS creator_objects_kind_check;
ALTER TABLE anthem.creator_objects
  ADD CONSTRAINT creator_objects_kind_check
  CHECK (kind IN ('texts', 'prints', 'made', 'art-toy', 'files'));

ALTER TABLE anthem.creator_objects
  ADD COLUMN IF NOT EXISTS reference_project_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_creator_objects_owner
  ON anthem.creator_objects (owner_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_creator_objects_published
  ON anthem.creator_objects (created_at DESC)
  WHERE status = 'Published';

CREATE TABLE IF NOT EXISTS anthem.object_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES anthem.creator_objects(id) ON DELETE RESTRICT,
  object_title text NOT NULL DEFAULT '',
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0 AND qty <= 20),
  finish text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'inquiry'
    CHECK (status IN ('inquiry', 'confirmed', 'preparing', 'shipped', 'completed', 'cancelled')),
  tracking_code text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_object_orders_seller
  ON anthem.object_orders (seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_object_orders_buyer
  ON anthem.object_orders (buyer_id, created_at DESC);

CREATE OR REPLACE FUNCTION anthem.enforce_creator_object_publish()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'anthem', 'shared', 'public'
AS $$
BEGIN
  IF NEW.status <> 'Published' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM anthem.projects
    WHERE owner_id = NEW.owner_id AND status = 'Published'
  ) THEN
    RAISE EXCEPTION 'เผยแพร่ผลงานอย่างน้อย 1 ชิ้นก่อนลงขาย';
  END IF;

  IF to_regclass('shared.kyc_requests') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM shared.kyc_requests
      WHERE user_id = NEW.owner_id
        AND status = 'approved'
        AND (kyc_expires_at IS NULL OR kyc_expires_at > now())
    ) THEN
      RAISE EXCEPTION 'ยืนยันตัวตนก่อนลงขาย';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creator_objects_publish ON anthem.creator_objects;
CREATE TRIGGER trg_creator_objects_publish
  BEFORE INSERT OR UPDATE OF status ON anthem.creator_objects
  FOR EACH ROW
  EXECUTE FUNCTION anthem.enforce_creator_object_publish();

CREATE OR REPLACE FUNCTION anthem.set_creator_objects_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_creator_objects_updated_at ON anthem.creator_objects;
CREATE TRIGGER trg_creator_objects_updated_at
  BEFORE UPDATE ON anthem.creator_objects
  FOR EACH ROW
  EXECUTE FUNCTION anthem.set_creator_objects_updated_at();

ALTER TABLE anthem.creator_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE anthem.object_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS creator_objects_select ON anthem.creator_objects;
CREATE POLICY creator_objects_select ON anthem.creator_objects
  FOR SELECT TO anon, authenticated
  USING (
    status = 'Published'
    OR owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS creator_objects_insert ON anthem.creator_objects;
CREATE POLICY creator_objects_insert ON anthem.creator_objects
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS creator_objects_update ON anthem.creator_objects;
CREATE POLICY creator_objects_update ON anthem.creator_objects
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS creator_objects_delete ON anthem.creator_objects;
CREATE POLICY creator_objects_delete ON anthem.creator_objects
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS object_orders_select ON anthem.object_orders;
CREATE POLICY object_orders_select ON anthem.object_orders
  FOR SELECT TO authenticated
  USING (
    buyer_id = auth.uid()
    OR seller_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS object_orders_insert ON anthem.object_orders;
CREATE POLICY object_orders_insert ON anthem.object_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    buyer_id = auth.uid()
    AND buyer_id <> seller_id
    AND EXISTS (
      SELECT 1 FROM anthem.creator_objects o
      WHERE o.id = object_id
        AND o.owner_id = seller_id
        AND o.status = 'Published'
    )
  );

DROP POLICY IF EXISTS object_orders_seller_update ON anthem.object_orders;
CREATE POLICY object_orders_seller_update ON anthem.object_orders
  FOR UPDATE TO authenticated
  USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS object_orders_buyer_cancel ON anthem.object_orders;
CREATE POLICY object_orders_buyer_cancel ON anthem.object_orders
  FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() AND status = 'inquiry')
  WITH CHECK (buyer_id = auth.uid() AND status = 'cancelled');

GRANT SELECT ON anthem.creator_objects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON anthem.creator_objects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON anthem.object_orders TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_creator_object_status(_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'anthem'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;
  IF _status NOT IN ('Draft', 'Published', 'Paused') THEN
    RAISE EXCEPTION 'สถานะไม่ถูกต้อง';
  END IF;
  UPDATE anthem.creator_objects SET status = _status WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบชิ้นงาน';
  END IF;
  PERFORM public.log_admin_audit(
    'creator_object.status',
    'creator_object',
    _id::text,
    jsonb_build_object('status', _status)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_creator_object(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'anthem'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'AUTH: admin only';
  END IF;
  IF EXISTS (SELECT 1 FROM anthem.object_orders WHERE object_id = _id) THEN
    RAISE EXCEPTION 'มีคำสั่งซื้อแล้ว ตั้งเป็นพักขายแทนการลบ';
  END IF;
  DELETE FROM anthem.creator_objects WHERE id = _id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบชิ้นงาน';
  END IF;
  PERFORM public.log_admin_audit('creator_object.delete', 'creator_object', _id::text, '{}'::jsonb);
END;
$$;
